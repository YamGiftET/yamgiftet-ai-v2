const notesState = {
    notes: [],
    editingId: null
};

const $ = id => document.getElementById(id);

function showNotesMessage(message, error = false) {
    const el = $("notesMessage");
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? "#b00020" : "";
}

function ethiopianNow() {
    try {
        const d = gregorianToEthiopian(new Date());
        return formatEthiopianDate(d.year, d.month, d.day);
    } catch {
        return "";
    }
}

async function loadNotes() {
    try {
        const res = await fetch("/api/notes");
        const data = await res.json();

        if (!data.success) throw new Error(data.error || "Notes ሊጫኑ አልቻሉም።");

        notesState.notes = data.notes || [];
        renderNotes();
    } catch (error) {
        showNotesMessage(error.message, true);
    }
}

function renderNotes() {
    const list = $("notesList");
    if (!list) return;

    const search = ($("notesSearch")?.value || "").toLowerCase().trim();
    const category = $("notesFilter")?.value || "";

    const filtered = notesState.notes.filter(note => {
        const text = [
            note.title,
            note.content,
            note.category
        ].join(" ").toLowerCase();

        return (!search || text.includes(search)) &&
               (!category || note.category === category);
    });

    if (!filtered.length) {
        list.innerHTML = `
            <div class="note-card">
                <p>📝 ምንም ማስታወሻ አልተገኘም።</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(note => {
        const photo = note.photoUrl
            ? `<img class="note-photo" src="${note.photoUrl}" alt="Note photo">`
            : "";

        const date = note.createdAt
            ? new Date(note.createdAt).toLocaleString("am-ET")
            : "";

        return `
            <article class="note-card">
                <span class="note-category">${escapeHtml(note.category || "ሌላ")}</span>
                <h3>${escapeHtml(note.title || "ያለ ርዕስ")}</h3>
                ${photo}
                <div class="note-content">${escapeHtml(note.content || "")}</div>
                <div class="note-date">
                    📅 ${ethiopianNow()} ${date ? " • " + date : ""}
                </div>
                <div class="note-actions">
                    <button type="button" onclick="editNote('${note.id}')">✏️ አስተካክል</button>
                    <button type="button" onclick="deleteNote('${note.id}')">🗑️ Trash</button>
                </div>
            </article>
        `;
    }).join("");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function saveNote(event) {
    event.preventDefault();

    const id = $("noteId").value.trim();
    const formData = new FormData();

    formData.append("title", $("noteTitle").value.trim());
    formData.append("category", $("noteCategory").value);
    formData.append("content", $("noteContent").value.trim());

    const photo = $("notePhoto").files[0];
    if (photo) formData.append("photo", photo);

    try {
        const url = id ? `/api/notes/${id}` : "/api/notes";
        const method = id ? "PATCH" : "POST";

        const res = await fetch(url, {
            method,
            body: formData
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || "ማስቀመጥ አልተቻለም።");
        }

        showNotesMessage(id
            ? "✅ ማስታወሻው ተስተካክሏል።"
            : "✅ ማስታወሻው ተመዝግቧል።");

        resetNoteForm();
        await loadNotes();
    } catch (error) {
        showNotesMessage(error.message, true);
    }
}

function editNote(id) {
    const note = notesState.notes.find(item => item.id === id);
    if (!note) return;

    $("noteId").value = note.id;
    $("noteTitle").value = note.title || "";
    $("noteCategory").value = note.category || "ሌላ";
    $("noteContent").value = note.content || "";
    $("notePhoto").value = "";

    $("saveNoteBtn").textContent = "💾 ለውጡን አስቀምጥ";
    $("cancelEditBtn").hidden = false;

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetNoteForm() {
    $("noteForm").reset();
    $("noteId").value = "";
    $("saveNoteBtn").textContent = "💾 አስቀምጥ";
    $("cancelEditBtn").hidden = true;
}

async function deleteNote(id) {
    if (!confirm("ይህን Note ወደ Trash መላክ ይፈልጋሉ?")) return;

    try {
        const res = await fetch(`/api/notes/${id}`, {
            method: "DELETE"
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || "መሰረዝ አልተቻለም።");
        }

        showNotesMessage("🗑️ Note ወደ Universal Trash ተልኳል።");
        await loadNotes();
    } catch (error) {
        showNotesMessage(error.message, true);
    }
}

$("noteForm")?.addEventListener("submit", saveNote);
$("cancelEditBtn")?.addEventListener("click", resetNoteForm);
$("notesSearch")?.addEventListener("input", renderNotes);
$("notesFilter")?.addEventListener("change", renderNotes);

document.addEventListener("DOMContentLoaded", loadNotes);

/* =====================================
   Notes AI Assistant
   ===================================== */

async function askNotesAI() {
    const question = $("notesAiQuestion")?.value.trim();
    const status = $("notesAiStatus");
    const replyBox = $("notesAiReply");
    const button = $("askNotesAiBtn");

    if (!question) {
        if (status) {
            status.textContent = "⚠️ እባክህ ጥያቄህን ጻፍ።";
        }
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "⏳ AI እያሰበ ነው...";
    }

    if (status) {
        status.textContent = "🤖 መልሱን እያዘጋጀ ነው...";
    }

    try {
        const res = await fetch("/api/notes-ai", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: question
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(
                data.error || "AI መልስ መስጠት አልቻለም።"
            );
        }

        if (replyBox) {
            replyBox.textContent = data.reply || "";
        }

        if (status) {
            status.textContent = "✅ AI መልሱን ሰጥቷል።";
        }

    } catch (error) {
        if (status) {
            status.textContent = "❌ " + error.message;
        }

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "🤖 AIን ጠይቅ";
        }
    }
}

function clearNotesAI() {
    if ($("notesAiQuestion")) {
        $("notesAiQuestion").value = "";
    }

    if ($("notesAiStatus")) {
        $("notesAiStatus").textContent = "";
    }

    if ($("notesAiReply")) {
        $("notesAiReply").innerHTML =
            '<div class="notes-ai-empty">💡 የAI ምክርህ እዚህ ይታያል።</div>';
    }
}

$("askNotesAiBtn")?.addEventListener("click", askNotesAI);
$("clearNotesAiBtn")?.addEventListener("click", clearNotesAI);

