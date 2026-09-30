const fs = require("fs");
const path = require("path");

const BIBLE_SOURCE_ROOT = path.join(
    __dirname,
    "data",
    "bible",
    "am_ulb_v7.2"
);

const BIBLE_SOURCE_VERSION = "Amharic ULB v7.2";
const BIBLE_SOURCE_LICENSE = "CC BY-SA 4.0";

function cleanUsfmText(text) {
    return String(text || "")
        .replace(/\\[a-z0-9]+\*?/gi, " ")
        .replace(/\|/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function parseUsfmFile(filePath) {
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

    let bookId = "";
    let book = "";
    let chapter = null;

    const verses = [];

    for (const line of lines) {
        const idMatch = line.match(/^\\id\s+(\S+)/);
        if (idMatch) {
            bookId = idMatch[1].trim();
            continue;
        }

        const bookMatch =
            line.match(/^\\toc1\s+(.+)$/) ||
            line.match(/^\\h\s+(.+)$/);

        if (bookMatch && !book) {
            book = bookMatch[1].trim();
            continue;
        }

        const chapterMatch = line.match(/^\\c\s+(\d+)/);
        if (chapterMatch) {
            chapter = Number(chapterMatch[1]);
            continue;
        }

        const verseMatch = line.match(/^\\v\s+(\d+)(?:-(\d+))?\s+(.+)$/);
        if (!verseMatch || !chapter) {
            continue;
        }

        const verseStart = Number(verseMatch[1]);
        const verseEnd = verseMatch[2]
            ? Number(verseMatch[2])
            : verseStart;

        const text = cleanUsfmText(verseMatch[3]);

        if (!bookId || !book || !Number.isInteger(chapter) ||
            !Number.isInteger(verseStart) ||
            !Number.isInteger(verseEnd) ||
            verseStart < 1 ||
            verseEnd < verseStart ||
            !text) {
            continue;
        }

        verses.push({
            bookId,
            book,
            chapter,
            verse: verseStart,
            verseStart,
            verseEnd,
            isVerseRange: verseStart !== verseEnd,
            text,
            sourceVersion: BIBLE_SOURCE_VERSION,
            sourceLicense: BIBLE_SOURCE_LICENSE,
            sourcePath: path.relative(__dirname, filePath)
        });
    }

    return {
        bookId,
        book,
        verses
    };
}

function toGeEzNumeral(value) {
    const n = Number(value);

    if (!Number.isInteger(n) || n < 1) {
        return String(value);
    }

    const ones = ["", "፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱"];
    const tens = ["", "፲", "፳", "፴", "፵", "፶", "፷", "፸", "፹", "፺"];

    if (n < 100) {
        return tens[Math.floor(n / 10)] + ones[n % 10];
    }

    if (n < 200) {
        return "፻" + (n === 100 ? "" : toGeEzNumeral(n - 100));
    }

    if (n < 1000) {
        const hundreds = Math.floor(n / 100);
        const remainder = n % 100;
        return (hundreds === 1 ? "፻" : toGeEzNumeral(hundreds) + "፻")
            + (remainder ? toGeEzNumeral(remainder) : "");
    }

    if (n < 10000) {
        const thousands = Math.floor(n / 1000);
        const remainder = n % 1000;
        return (thousands === 1 ? "፲፻" : toGeEzNumeral(thousands) + "፻")
            + (remainder ? toGeEzNumeral(remainder) : "");
    }

    return String(n);
}

function formatScriptureReference(book, chapter, verseStart, verseEnd = verseStart) {
    const chapterText = toGeEzNumeral(chapter);
    const startText = toGeEzNumeral(verseStart);
    const endText = toGeEzNumeral(verseEnd);

    return verseStart === verseEnd
        ? `${book} ${chapterText}፥${startText}`
        : `${book} ${chapterText}፥${startText}–${endText}`;
}

function loadBibleVerses() {
    if (!fs.existsSync(BIBLE_SOURCE_ROOT)) {
        throw new Error("Bible source directory not found");
    }

    const files = fs
        .readdirSync(BIBLE_SOURCE_ROOT)
        .filter(file => file.endsWith(".usfm"))
        .sort();

    const allVerses = [];

    for (const file of files) {
        const parsed = parseUsfmFile(
            path.join(BIBLE_SOURCE_ROOT, file)
        );

        allVerses.push(...parsed.verses);
    }

    return allVerses;
}

module.exports = {
    BIBLE_SOURCE_ROOT,
    BIBLE_SOURCE_VERSION,
    BIBLE_SOURCE_LICENSE,
    cleanUsfmText,
    parseUsfmFile,
    loadBibleVerses,
    toGeEzNumeral,
    formatScriptureReference
};
