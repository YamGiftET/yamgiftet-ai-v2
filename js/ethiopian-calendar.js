// =====================================
// YamGiftET
// Ethiopian Calendar
// =====================================

const ETHIOPIAN_EPOCH = 1724221;

const ETHIOPIAN_MONTHS = [
    "መስከረም",
    "ጥቅምት",
    "ኅዳር",
    "ታኅሣሥ",
    "ጥር",
    "የካቲት",
    "መጋቢት",
    "ሚያዝያ",
    "ግንቦት",
    "ሰኔ",
    "ሐምሌ",
    "ነሐሴ",
    "ጳጉሜን"
];


// =====================================
// Gregorian → Julian Day
// =====================================

function gregorianToJDN(year, month, day) {

    const a =
        Math.floor((14 - month) / 12);

    const y =
        year + 4800 - a;

    const m =
        month + 12 * a - 3;

    return (
        day +
        Math.floor((153 * m + 2) / 5) +
        365 * y +
        Math.floor(y / 4) -
        Math.floor(y / 100) +
        Math.floor(y / 400) -
        32045
    );
}


// =====================================
// Julian Day → Ethiopian
// =====================================

function jdnToEthiopian(jdn) {

    const year =
        Math.floor(
            (4 * (jdn - ETHIOPIAN_EPOCH) + 1463) / 1461
        );

    const firstDay =
        ETHIOPIAN_EPOCH +
        365 * (year - 1) +
        Math.floor((year - 1) / 4);

    const month =
        Math.floor(
            (jdn - firstDay) / 30
        ) + 1;

    const day =
        jdn -
        (
            firstDay +
            30 * (month - 1)
        ) + 1;

    return {
        year,
        month,
        day
    };
}


// =====================================
// Ethiopian → Julian Day
// =====================================

function ethiopianToJDN(year, month, day) {

    return (
        ETHIOPIAN_EPOCH +
        365 * (year - 1) +
        Math.floor((year - 1) / 4) +
        30 * (month - 1) +
        day - 1
    );
}


// =====================================
// Ethiopian → Gregorian
// =====================================

function jdnToGregorian(jdn) {

    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c =
        a -
        Math.floor((146097 * b) / 4);

    const d =
        Math.floor((4 * c + 3) / 1461);

    const e =
        c -
        Math.floor((1461 * d) / 4);

    const m =
        Math.floor((5 * e + 2) / 153);

    const day =
        e -
        Math.floor((153 * m + 2) / 5) +
        1;

    const month =
        m + 3 -
        12 * Math.floor(m / 10);

    const year =
        100 * b +
        d -
        4800 +
        Math.floor(m / 10);

    return {
        year,
        month,
        day
    };
}


function ethiopianToGregorian(year, month, day) {

    const jdn =
        ethiopianToJDN(
            year,
            month,
            day
        );

    return jdnToGregorian(jdn);
}


// =====================================
// Gregorian → Ethiopian
// =====================================

function gregorianToEthiopian(date) {

    const jdn =
        gregorianToJDN(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate()
        );

    return jdnToEthiopian(jdn);
}


// =====================================
// Ethiopian Date Formatting
// =====================================

function formatEthiopianDate(
    year,
    month,
    day
) {

    return (
        `${day} ${ETHIOPIAN_MONTHS[month - 1]} ${year}`
    );
}


// =====================================
// የጳጉሜን ቀናት
// =====================================

function getEthiopianMonthDays(
    year,
    month
) {

    if (month !== 13) {
        return 30;
    }

    return year % 4 === 3 ? 6 : 5;
}


// =====================================
// Select መሙላት
// =====================================

function populateEthiopianDate(
    prefix,
    defaultDate = new Date()
) {

    const yearSelect =
        document.getElementById(
            `${prefix}Year`
        );

    const monthSelect =
        document.getElementById(
            `${prefix}Month`
        );

    const daySelect =
        document.getElementById(
            `${prefix}Day`
        );

    if (
        !yearSelect ||
        !monthSelect ||
        !daySelect
    ) {
        return;
    }


    const today =
        gregorianToEthiopian(
            defaultDate
        );


    // ዓመታት
    yearSelect.innerHTML = "";

    for (
        let year = today.year - 2;
        year <= today.year + 5;
        year++
    ) {

        const option =
            document.createElement("option");

        option.value = year;
        option.textContent = year;

        if (year === today.year) {
            option.selected = true;
        }

        yearSelect.appendChild(option);
    }


    // ወራት
    monthSelect.innerHTML = "";

    ETHIOPIAN_MONTHS.forEach(
        (monthName, index) => {

            const option =
                document.createElement("option");

            option.value = index + 1;
            option.textContent =
                `${index + 1}. ${monthName}`;

            if (index + 1 === today.month) {
                option.selected = true;
            }

            monthSelect.appendChild(option);
        }
    );


    updateEthiopianDays(
        prefix,
        today.day
    );
}


// =====================================
// ቀናት Update
// =====================================

function updateEthiopianDays(
    prefix,
    selectedDay = 1
) {

    const year =
        Number(
            document.getElementById(
                `${prefix}Year`
            )?.value
        );

    const month =
        Number(
            document.getElementById(
                `${prefix}Month`
            )?.value
        );

    const daySelect =
        document.getElementById(
            `${prefix}Day`
        );

    if (!year || !month || !daySelect) {
        return;
    }


    const maxDays =
        getEthiopianMonthDays(
            year,
            month
        );


    daySelect.innerHTML = "";


    for (
        let day = 1;
        day <= maxDays;
        day++
    ) {

        const option =
            document.createElement("option");

        option.value = day;
        option.textContent = day;

        if (
            day ===
            Math.min(
                selectedDay,
                maxDays
            )
        ) {
            option.selected = true;
        }

        daySelect.appendChild(option);
    }
}


// =====================================
// የተመረጠውን ቀን ማግኘት
// =====================================

function getEthiopianDate(prefix) {

    const year =
        Number(
            document.getElementById(
                `${prefix}Year`
            )?.value
        );

    const month =
        Number(
            document.getElementById(
                `${prefix}Month`
            )?.value
        );

    const day =
        Number(
            document.getElementById(
                `${prefix}Day`
            )?.value
        );

    if (
        !year ||
        !month ||
        !day
    ) {
        return "";
    }

    return (
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
}


// =====================================
// Ethiopian → ISO Gregorian
// =====================================

function ethiopianDateToISO(
    prefix
) {

    const year =
        Number(
            document.getElementById(
                `${prefix}Year`
            )?.value
        );

    const month =
        Number(
            document.getElementById(
                `${prefix}Month`
            )?.value
        );

    const day =
        Number(
            document.getElementById(
                `${prefix}Day`
            )?.value
        );

    if (
        !year ||
        !month ||
        !day
    ) {
        return "";
    }


    const gregorian =
        ethiopianToGregorian(
            year,
            month,
            day
        );


    return (
        `${gregorian.year}-${String(gregorian.month).padStart(2, "0")}-${String(gregorian.day).padStart(2, "0")}`
    );
}


// =====================================
// የCalendar UI ጀምር
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        populateEthiopianDate(
            "orderDate"
        );

        populateEthiopianDate(
            "pickupDate"
        );


        [
            "orderDate",
            "pickupDate"
        ].forEach(prefix => {

            const year =
                document.getElementById(
                    `${prefix}Year`
                );

            const month =
                document.getElementById(
                    `${prefix}Month`
                );

            if (year) {

                year.addEventListener(
                    "change",
                    () => updateEthiopianDays(
                        prefix
                    )
                );

            }

            if (month) {

                month.addEventListener(
                    "change",
                    () => updateEthiopianDays(
                        prefix
                    )
                );

            }

        });

    }
);
