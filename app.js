/**
 * app.js - Hospital Directory & Digital ECard Engine
 * Built with Vanilla JavaScript, LocalStorage DB, and CSS3 transitions.
 */

// 1. DUMMY DATA SEEDING (Used if LocalStorage is empty)
const SEED_DOCTORS = [
    {
        id: "doc-mansing-patil",
        name: "Dr. Mansing Patil",
        specialty: "Ayurvedic Medicine",
        department: "General Medicine",
        experience: 20,
        rating: 5,
        phone: "9922231315",
        whatsapp: "9922231315",
        email: "drmansingpatil@swamisamarth.com",
        clinicName: "Swami Samarth Hospital Beedshed",
        address: "Swami samarth hospital beedshed tal karveer dist kolhapur, Maharashtra, India",
        mapUrl: "https://maps.app.goo.gl/pcNMqtHSPwEamLoA8",
        hoursDays: "Mon - Sat",
        hoursTime: "8:00 AM - 2:00 PM, 5:00 PM - 9:00 PM",
        imageUrl: "", // Empty string triggers initials fallback
        type: "doctor"
    },
    {
        id: "doc-ashwini-patil",
        name: "Dr. Ashwini Patil",
        specialty: "Homeopathy Medicine",
        department: "General Medicine",
        experience: 20,
        rating: 5,
        phone: "9021751057",
        whatsapp: "9021751057",
        email: "drashwinimpatil8@gmail.com",
        clinicName: "Swami Samarth Hospital Beedshed",
        address: "Swami samarth hospital beedshed tal karveer dist kolhapur, Maharashtra, India",
        mapUrl: "https://maps.app.goo.gl/pcNMqtHSPwEamLoA8",
        hoursDays: "Mon - Sat",
        hoursTime: "8:00 AM - 2:00 PM, 5:00 PM - 9:00 PM",
        imageUrl: "", // Empty string triggers initials fallback
        type: "doctor"
    }
];

const SEED_STAFF = [
    {
        id: "staff-swati-patil",
        name: "Swati Patil",
        specialty: "Senior Staff Nurse",
        department: "Nursing",
        experience: 8,
        rating: 5,
        phone: "9922231315",
        whatsapp: "9922231315",
        email: "swati.patil@swamisamarth.com",
        clinicName: "Swami Samarth Hospital Beedshed",
        address: "Swami samarth hospital beedshed tal karveer dist kolhapur, Maharashtra, India",
        mapUrl: "https://maps.app.goo.gl/pcNMqtHSPwEamLoA8",
        hoursDays: "Mon - Sat",
        hoursTime: "8:00 AM - 4:00 PM",
        imageUrl: "",
        type: "staff"
    },
    {
        id: "staff-ranjit-salunkhe",
        name: "Ranjit Salunkhe",
        specialty: "Lab Technician",
        department: "Laboratory",
        experience: 6,
        rating: 5,
        phone: "9922231315",
        whatsapp: "9922231315",
        email: "ranjit.salunkhe@swamisamarth.com",
        clinicName: "Swami Samarth Hospital Beedshed",
        address: "Swami samarth hospital beedshed tal karveer dist kolhapur, Maharashtra, India",
        mapUrl: "https://maps.app.goo.gl/pcNMqtHSPwEamLoA8",
        hoursDays: "Mon - Sat",
        hoursTime: "9:00 AM - 6:00 PM",
        imageUrl: "",
        type: "staff"
    }
];

class HospitalECardApp {
    constructor() {
        this.doctors = [];
        this.activeView = "directory";
        this.selectedDoctorId = null;
        this.currentFilterDepartment = "All";
        this.currentSearchQuery = "";
        this.adminSelectedDoctorId = null;

        // Dom Elements Cache
        this.views = {
            directory: document.getElementById("view-directory"),
            ecard: document.getElementById("view-ecard"),
            admin: document.getElementById("view-admin")
        };
        this.navBtns = {
            directory: document.getElementById("btn-nav-directory"),
            admin: document.getElementById("btn-nav-admin")
        };
        this.pendingAdminAction = null;
    }

    // Initialize App
    init() {
        this.loadDoctors();
        this.checkTheme();
        this.renderDirectory();
        this.initHomepageFeatures();

        // Listen to hash changes (simulating QR scan landing)
        window.addEventListener("hashchange", () => this.handleRouting());

        // Initial routing check
        this.handleRouting();

        // Populate appointment date with tomorrow by default
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById("book-date").value = tomorrow.toISOString().substring(0, 10);
    }

    // Helper: calculate start date string based on years/months of experience
    getStartDateFromExperience(years, months = 0) {
        const d = new Date();
        d.setDate(1); // Set day to 1 to avoid month overflow (e.g. Feb 30th)
        d.setMonth(d.getMonth() - months);
        d.setFullYear(d.getFullYear() - years);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}`;
    }

    // Helper: calculate experience years and months from start date string
    getExperienceFromStartDate(startDateStr) {
        if (!startDateStr) return { years: 0, months: 0 };
        const parts = startDateStr.split("-");
        const startYear = parseInt(parts[0]);
        const startMonth = parseInt(parts[1]) - 1; // 0-indexed
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        let diffMonths = (currentYear - startYear) * 12 + (currentMonth - startMonth);
        if (diffMonths < 0) diffMonths = 0;
        
        const years = Math.floor(diffMonths / 12);
        const months = diffMonths % 12;
        return { years, months };
    }

    // Helper: format experience years and months as a numeric value (e.g. 12.5)
    getExperienceValue(years, months) {
        if (!months || months === 0) return years;
        const val = years + months / 12;
        return Math.round(val * 10) / 10;
    }

    // Load doctors from LocalStorage or seed defaults
    loadDoctors() {
        const localData = localStorage.getItem("hospital_doctors_v4");
        if (localData) {
            try {
                this.doctors = JSON.parse(localData);
                let migrated = false;
                
                // Ensure all existing doctors have type: 'doctor' and calculate experience
                this.doctors.forEach(d => {
                    if (!d.type) {
                        d.type = 'doctor';
                        migrated = true;
                    }
                    
                    if (!d.experienceStartDate) {
                        // Create one based on existing static experience
                        const years = parseInt(d.experience) || 0;
                        d.experienceStartDate = this.getStartDateFromExperience(years, 0);
                        migrated = true;
                    }
                    
                    // Migrate map URLs to the new one
                    if (d.mapUrl === "https://maps.app.goo.gl/RzKnaszod3cJwGCo7" || d.mapUrl === "https://maps.app.goo.gl/ERseMFW4hGXfVzGt7") {
                        d.mapUrl = "https://maps.app.goo.gl/pcNMqtHSPwEamLoA8";
                        migrated = true;
                    }
                    
                    // Recalculate experience based on experienceStartDate
                    const exp = this.getExperienceFromStartDate(d.experienceStartDate);
                    const expVal = this.getExperienceValue(exp.years, exp.months);
                    if (d.experience !== expVal) {
                        d.experience = expVal;
                        migrated = true;
                    }
                });

                // Seed default staff members if no staff members exist
                const hasStaff = this.doctors.some(d => d.type === 'staff');
                if (!hasStaff) {
                    this.doctors.push(...SEED_STAFF);
                    migrated = true;
                }

                if (migrated) {
                    this.saveDoctorsToLocal();
                }
            } catch (e) {
                console.error("Failed to parse LocalStorage doctors data. Re-seeding...", e);
                this.doctors = [...SEED_DOCTORS, ...SEED_STAFF];
                this.doctors.forEach(d => {
                    if (!d.experienceStartDate) {
                        d.experienceStartDate = this.getStartDateFromExperience(d.experience, 0);
                    }
                });
                this.saveDoctorsToLocal();
            }
        } else {
            this.doctors = [...SEED_DOCTORS, ...SEED_STAFF];
            this.doctors.forEach(d => {
                if (!d.experienceStartDate) {
                    d.experienceStartDate = this.getStartDateFromExperience(d.experience, 0);
                }
            });
            this.saveDoctorsToLocal();
        }
        this.updateStats();
    }

    saveDoctorsToLocal() {
        localStorage.setItem("hospital_doctors_v4", JSON.stringify(this.doctors));
        this.updateStats();
    }

    updateStats() {
        const docCount = this.doctors.filter(d => d.type === 'doctor').length;
        const staffCount = this.doctors.filter(d => d.type === 'staff').length;

        const docCountEl = document.getElementById("stat-doctor-count");
        if (docCountEl) {
            docCountEl.innerText = `${docCount}+`;
        }

        const staffCountEl = document.getElementById("stat-staff-count");
        if (staffCountEl) {
            staffCountEl.innerText = `${staffCount}+`;
        }
    }

    // Routing based on URL Hash
    handleRouting() {
        const hash = window.location.hash;
        if (hash.startsWith("#doctor-")) {
            const docId = hash.replace("#doctor-", "");
            const docExists = this.doctors.some(d => d.id === docId);
            if (docExists) {
                this.selectedDoctorId = docId;
                this.navigateTo("ecard");
                this.renderDoctorECard(docId);
                return;
            }
        }
        // Fallback to directory if hash is invalid or empty
        this.navigateTo(this.activeView);
    }

    // Navigation and view management
    navigateTo(viewName) {
        if (viewName === "admin" && !this.isAdminAuthenticated()) {
            this.pendingAdminAction = () => {
                this.navigateTo("admin");
            };
            this.openAdminLoginModal();
            return;
        }

        this.activeView = viewName;

        // Toggle Views
        Object.keys(this.views).forEach(key => {
            if (key === viewName) {
                this.views[key].classList.add("active-view");
            } else {
                this.views[key].classList.remove("active-view");
            }
        });

        // Toggle nav buttons focus
        Object.keys(this.navBtns).forEach(key => {
            if (this.navBtns[key]) {
                if (key === viewName) {
                    this.navBtns[key].classList.add("active");
                } else {
                    this.navBtns[key].classList.remove("active");
                }
            }
        });

        // Handle specific view loadings
        if (viewName === "directory") {
            // Remove doctor hash from URL to reset state without page reload
            if (window.location.hash.startsWith("#doctor-")) {
                history.pushState("", document.title, window.location.pathname + window.location.search);
            }
            this.renderDirectory();
        } else if (viewName === "admin") {
            this.setupAdminView();
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Toggle Dark / Light Theme
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("app_theme", newTheme);
        this.updateThemeButtonIcon(newTheme);
    }

    checkTheme() {
        const savedTheme = localStorage.getItem("app_theme") || "light";
        document.documentElement.setAttribute("data-theme", savedTheme);
        this.updateThemeButtonIcon(savedTheme);
    }

    updateThemeButtonIcon(theme) {
        const btn = document.getElementById("theme-toggle");
        if (btn) {
            btn.innerHTML = theme === "dark"
                ? `<i class="bi bi-sun-fill"></i>`
                : `<i class="bi bi-moon-fill"></i>`;
        }
    }

    // Helper: generate initials fallback avatar
    getInitials(name) {
        return name
            .split(" ")
            .map(n => n[0])
            .filter((c, i) => i < 2)
            .join("")
            .toUpperCase()
            .replace("DR", "");
    }

    // 2. MAIN DIRECTORY LOGIC
    renderDirectory() {
        const docContainer = document.getElementById("doctors-list");
        const staffContainer = document.getElementById("staff-list");
        if (!docContainer || !staffContainer) return;

        const searchLower = this.currentSearchQuery.toLowerCase();

        // 1. FILTER & RENDER MEDICAL SPECIALISTS
        const doctorsData = this.doctors.filter(d => d.type === 'doctor' || !d.type);
        const filteredDocs = doctorsData.filter(doc => {
            const matchesDept = this.currentFilterDepartment === "All" || doc.department === this.currentFilterDepartment;

            const matchesSearch = doc.name.toLowerCase().includes(searchLower) ||
                doc.specialty.toLowerCase().includes(searchLower) ||
                doc.department.toLowerCase().includes(searchLower) ||
                doc.clinicName.toLowerCase().includes(searchLower);

            return matchesDept && matchesSearch;
        });

        document.getElementById("results-count").innerText = `Showing ${filteredDocs.length} specialist${filteredDocs.length === 1 ? '' : 's'}`;

        if (filteredDocs.length === 0) {
            docContainer.innerHTML = `
                <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
                    <i class="bi bi-person-exclamation" style="font-size: 48px; color: var(--text-light);"></i>
                    <p style="margin-top: 10px; font-weight: 600;">No medical specialists found matching your criteria.</p>
                </div>
            `;
        } else {
            docContainer.innerHTML = filteredDocs.map(doc => {
                const avatarHtml = doc.imageUrl
                    ? `<img class="doc-card-photo" src="${doc.imageUrl}" alt="${doc.name}">`
                    : `<div class="doc-card-avatar-fallback">${this.getInitials(doc.name) || 'Dr'}</div>`;

                const starStr = "★".repeat(doc.rating) + "☆".repeat(5 - doc.rating);
                const isAvailable = this.isDoctorAvailableToday(doc.hoursDays);

                return `
                    <div class="doc-card">
                        <div class="availability-badge ${isAvailable ? 'available' : 'unavailable'}">
                            <span class="status-dot"></span> ${isAvailable ? 'Available Today' : 'Off Duty Today'}
                        </div>
                        <div class="doc-card-banner"></div>
                        <div class="doc-card-profile">
                            ${avatarHtml}
                        </div>
                        <div class="doc-card-body">
                            <h3>${doc.name}</h3>
                            <span class="doc-card-specialty">${doc.specialty}</span>
                            
                            <div class="doc-card-stats" style="border: none; padding: 0 0 10px; margin-bottom: 12px;">
                                <div>Exp: <strong>${doc.experience} Yrs</strong></div>
                                <div>Rating: <strong style="color:#eab308">${starStr}</strong></div>
                            </div>

                            <div class="doc-card-actions">
                                <button onclick="app.scrollToBookingForm('${doc.id}')" class="doc-card-btn view-profile" style="background: var(--accent-orange); color: white; border: none;">
                                    <i class="bi bi-calendar-check"></i> Book
                                </button>
                                <button onclick="app.viewDoctorProfile('${doc.id}')" class="doc-card-btn view-profile">
                                    <i class="bi bi-card-text"></i> Profile
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join("");
        }

        // 2. FILTER & RENDER SUPPORT STAFF
        const staffData = this.doctors.filter(d => d.type === 'staff');
        const filteredStaff = staffData.filter(st => {
            return st.name.toLowerCase().includes(searchLower) ||
                st.specialty.toLowerCase().includes(searchLower) ||
                st.department.toLowerCase().includes(searchLower) ||
                st.clinicName.toLowerCase().includes(searchLower);
        });

        const staffCountEl = document.getElementById("staff-results-count");
        if (staffCountEl) {
            staffCountEl.innerText = `Showing ${filteredStaff.length} staff member${filteredStaff.length === 1 ? '' : 's'}`;
        }

        if (filteredStaff.length === 0) {
            staffContainer.innerHTML = `
                <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
                    <i class="bi bi-person-exclamation" style="font-size: 48px; color: var(--text-light);"></i>
                    <p style="margin-top: 10px; font-weight: 600;">No support staff members found matching your criteria.</p>
                </div>
            `;
        } else {
            staffContainer.innerHTML = filteredStaff.map(st => {
                const avatarHtml = st.imageUrl
                    ? `<img class="doc-card-photo" src="${st.imageUrl}" alt="${st.name}">`
                    : `<div class="doc-card-avatar-fallback">${this.getInitials(st.name) || 'Staff'}</div>`;

                const isAvailable = this.isDoctorAvailableToday(st.hoursDays);

                return `
                    <div class="doc-card">
                        <div class="availability-badge ${isAvailable ? 'available' : 'unavailable'}">
                            <span class="status-dot"></span> ${isAvailable ? 'Available Today' : 'Off Duty Today'}
                        </div>
                        <div class="doc-card-banner"></div>
                        <div class="doc-card-profile">
                            ${avatarHtml}
                        </div>
                        <div class="doc-card-body">
                            <h3>${st.name}</h3>
                            <span class="doc-card-specialty">${st.specialty}</span>
                            
                            <div class="doc-card-stats" style="border: none; padding: 0 0 10px; margin-bottom: 12px;">
                                <div>Dept: <strong>${st.department}</strong></div>
                                <div>Exp: <strong>${st.experience} Yrs</strong></div>
                            </div>

                            <div class="doc-card-actions">
                                <a href="tel:${st.phone}" class="doc-card-btn call-quick" title="Call Staff" style="width: 50%;">
                                    <i class="bi bi-telephone-fill"></i> Call
                                </a>
                                <button onclick="app.viewDoctorProfile('${st.id}')" class="doc-card-btn view-profile" style="width: 50%;">
                                    <i class="bi bi-card-text"></i> Profile
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join("");
        }

        // Populate homepage form select options
        this.populateHomepageBookingDoctors();
    }

    viewDoctorProfile(docId) {
        // Change hash which triggers hashchange listener
        window.location.hash = `#doctor-${docId}`;
    }

    filterDepartment(deptName) {
        this.currentFilterDepartment = deptName;

        // Update Filter Pills CSS class
        document.querySelectorAll(".filter-pill").forEach(pill => {
            if (pill.getAttribute("data-dept") === deptName) {
                pill.classList.add("active");
            } else {
                pill.classList.remove("active");
            }
        });

        this.renderDirectory();
    }

    filterDoctors() {
        this.currentSearchQuery = document.getElementById("search-input").value;
        this.renderDirectory();
    }

    // 3. DOCTOR ECARD LOGIC
    renderDoctorECard(docId) {
        const doc = this.doctors.find(d => d.id === docId);
        if (!doc) return;

        const isStaff = doc.type === 'staff';
        const ecardView = document.getElementById("view-ecard");
        
        // Toggle staff theme styling
        if (isStaff) {
            ecardView.classList.add("staff-theme");
            document.getElementById("ecard-hours-title").innerText = "WORKING HOURS";
            document.getElementById("ecard-booking-btn").style.display = "none";
            document.getElementById("ecard-rating-divider").style.display = "none";
            document.getElementById("ecard-rating-col").style.display = "none";
            document.getElementById("ecard-exp-label").innerText = "Years Exp";
            document.getElementById("ecard-action-call").innerHTML = `<i class="bi bi-telephone-fill"></i> Call Staff`;
        } else {
            ecardView.classList.remove("staff-theme");
            document.getElementById("ecard-hours-title").innerText = "CONSULTATION HOURS";
            document.getElementById("ecard-booking-btn").style.display = "block";
            document.getElementById("ecard-rating-divider").style.display = "block";
            document.getElementById("ecard-rating-col").style.display = "block";
            document.getElementById("ecard-exp-label").innerText = "Years Exp";
            document.getElementById("ecard-action-call").innerHTML = `<i class="bi bi-telephone-fill"></i> Call Doctor`;
        }

        // Name and Titles
        document.getElementById("ecard-name").innerText = doc.name;
        document.getElementById("ecard-specialty").innerText = doc.specialty;
        document.getElementById("ecard-clinic-name").innerText = doc.clinicName;
        document.getElementById("ecard-clinic-address").innerText = doc.address;
        document.getElementById("ecard-hours-days").innerText = doc.hoursDays;
        document.getElementById("ecard-hours-time").innerText = doc.hoursTime;
        document.getElementById("ecard-exp-num").innerText = doc.experience;

        // Rating
        const starStr = "★".repeat(doc.rating) + "☆".repeat(5 - doc.rating);
        document.getElementById("ecard-rating-stars").innerText = starStr;

        // Links and hrefs
        document.getElementById("ecard-action-call").href = `tel:${doc.phone}`;

        // Whatsapp link
        const waNum = doc.whatsapp || doc.phone;
        const textMessage = isStaff 
            ? encodeURIComponent(`Hello ${doc.name}, I would like to contact you regarding your duties/services at the hospital.`)
            : encodeURIComponent(`Hello ${doc.name}, I would like to inquire about your consultation.`);
        document.getElementById("ecard-action-whatsapp").href = `https://wa.me/${waNum}?text=${textMessage}`;

        // Map Redirect Link
        const mapBtn = document.getElementById("ecard-action-map");
        if (doc.mapUrl && !isStaff) {
            mapBtn.href = doc.mapUrl;
            mapBtn.style.display = "flex";
        } else {
            mapBtn.style.display = "none";
        }

        // Contact text anchors
        const phoneAnchor = document.getElementById("ecard-contact-phone");
        phoneAnchor.innerText = doc.phone;
        phoneAnchor.href = `tel:${doc.phone}`;

        const emailAnchor = document.getElementById("ecard-contact-email");
        emailAnchor.innerText = doc.email;
        emailAnchor.href = `mailto:${doc.email}`;

        // Photo or placeholder
        const photoContainer = document.getElementById("ecard-photo-container");
        if (doc.imageUrl) {
            photoContainer.innerHTML = `<img src="${doc.imageUrl}" alt="${doc.name}">`;
        } else {
            photoContainer.innerHTML = isStaff
                ? `<div class="avatar-fallback" style="background: linear-gradient(135deg, var(--primary-medium), var(--secondary));">${this.getInitials(doc.name) || 'Staff'}</div>`
                : `<div class="avatar-fallback">${this.getInitials(doc.name) || 'Dr'}</div>`;
        }
    }

    // Dynamic vCard Generation
    downloadDoctorVCard() {
        const doc = this.doctors.find(d => d.id === this.selectedDoctorId);
        if (!doc) return;

        const cleanName = doc.name.replace(/Dr\.\s+/g, "");
        const isStaff = doc.type === 'staff';

        // Build vCard text
        const vcardContent = [
            "BEGIN:VCARD",
            "VERSION:3.0",
            `N:;${cleanName};;;`,
            `FN:${doc.name}`,
            `ORG:${doc.clinicName};`,
            `TITLE:${doc.specialty}`,
            `TEL;TYPE=CELL,VOICE:${doc.phone}`,
            `TEL;TYPE=WORK,MSG:${doc.whatsapp || doc.phone}`,
            `EMAIL;TYPE=PREF,INTERNET:${doc.email}`,
            `ADR;TYPE=WORK:;;${doc.address};;;;`,
            `NOTE:${isStaff ? 'Working' : 'Consultation'} Hours: ${doc.hoursDays} (${doc.hoursTime})`,
            `URL:${window.location.origin + window.location.pathname}#doctor-${doc.id}`,
            "REV:" + new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z",
            "END:VCARD"
        ].join("\r\n");

        // Download Blob
        const blob = new Blob([vcardContent], { type: "text/vcard;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${cleanName.toLowerCase().replace(/\s+/g, "_")}_contact.vcf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Share Modal trigger
    shareDoctorCard() {
        const doc = this.doctors.find(d => d.id === this.selectedDoctorId);
        if (!doc) return;

        const shareUrl = `${window.location.origin + window.location.pathname}#doctor-${doc.id}`;
        const titlePrefix = doc.type === 'staff' ? '' : 'Dr. ';
        const cleanDocName = doc.name.replace(/Dr\.\s+/g, "");

        // Update input
        document.getElementById("share-url-input").value = shareUrl;
        document.getElementById("share-modal-title").innerText = `Scan the QR code below to save ${titlePrefix}${cleanDocName}'s ECard on your mobile, or share the direct link.`;

        // Update social shares
        const waText = encodeURIComponent(`Scan or click to view digital contact card of ${doc.name} (${doc.specialty}): ${shareUrl}`);
        document.getElementById("share-social-whatsapp").href = `https://wa.me/?text=${waText}`;
        document.getElementById("share-social-email").href = `mailto:?subject=${encodeURIComponent(doc.name + ' - Digital ECard')}&body=${waText}`;

        // QR Code generation via QR Server API (Free, high-speed CDN)
        const qrImgEl = document.getElementById("modal-qr-image");
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`;
        qrImgEl.src = qrUrl;

        // Try web share first if available on mobile
        if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
            navigator.share({
                title: `${doc.name} - Digital Card`,
                text: `${doc.specialty} at ${doc.clinicName}`,
                url: shareUrl
            }).catch(() => {
                // Fail fallback: open custom modal
                this.openModal("modal-share");
            });
        } else {
            this.openModal("modal-share");
        }
    }

    shareHospitalCard() {
        const shareUrl = `${window.location.origin + window.location.pathname}`;

        // Update input
        document.getElementById("share-url-input").value = shareUrl;
        document.getElementById("share-modal-title").innerText = `Scan the QR code below to view Shri Swami Samarth Hospital Directory or share the link.`;

        // Update social shares
        const waText = encodeURIComponent(`Find and connect with medical specialists at Shri Swami Samarth Hospital: ${shareUrl}`);
        document.getElementById("share-social-whatsapp").href = `https://wa.me/?text=${waText}`;
        document.getElementById("share-social-email").href = `mailto:?subject=Shri Swami Samarth Hospital Directory&body=${waText}`;

        // QR Code
        const qrImgEl = document.getElementById("modal-qr-image");
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`;
        qrImgEl.src = qrUrl;

        this.openModal("modal-share");
    }

    copyShareUrl() {
        const input = document.getElementById("share-url-input");
        input.select();
        input.setSelectionRange(0, 99999); // Mobile compatibility

        navigator.clipboard.writeText(input.value)
            .then(() => {
                const btn = document.getElementById("btn-copy-url");
                const oldHTML = btn.innerHTML;
                btn.innerHTML = `<i class="bi bi-check-lg"></i> Copied!`;
                btn.style.background = "#22c55e";
                setTimeout(() => {
                    btn.innerHTML = oldHTML;
                    btn.style.background = "";
                }, 2000);
            })
            .catch(err => {
                console.error("Could not copy link to clipboard: ", err);
            });
    }

    downloadQR() {
        const qrImgEl = document.getElementById("modal-qr-image");
        if (!qrImgEl.src) return;

        // Force browser to download the QR code image
        fetch(qrImgEl.src)
            .then(resp => resp.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `swami_samarth_hospital_ecard_qrcode.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(err => {
                // Fail fallback: open image in new window/tab for saving
                window.open(qrImgEl.src, "_blank");
            });
    }

    // Modal Helpers
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add("show");
            document.body.style.overflow = "hidden"; // disable scroll
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("show");
            document.body.style.overflow = ""; // restore scroll
        }
    }

    // 4. BOOKING FLOW
    openBookingModal() {
        const doc = this.doctors.find(d => d.id === this.selectedDoctorId);
        if (!doc) return;

        // Fill modal details
        document.getElementById("booking-doc-name").innerText = doc.name;
        document.getElementById("booking-doc-specialty").innerText = doc.specialty;

        // Avatar fallback
        const avatarBox = document.getElementById("booking-doc-avatar");
        if (doc.imageUrl) {
            avatarBox.innerHTML = `<img src="${doc.imageUrl}" alt="${doc.name}">`;
        } else {
            avatarBox.innerHTML = `<div class="fallback">${this.getInitials(doc.name) || 'Dr'}</div>`;
        }

        this.openModal("modal-booking");
    }

    confirmBooking(e) {
        e.preventDefault();
        const doc = this.doctors.find(d => d.id === this.selectedDoctorId);
        if (!doc) return;

        const patientName = document.getElementById("book-patient-name").value;
        const patientPhone = document.getElementById("book-patient-phone").value;
        const patientEmail = document.getElementById("book-patient-email").value;
        const dateVal = document.getElementById("book-date").value;
        const timeSlot = document.getElementById("book-time").value;

        // Generate receipt values
        const randomReceiptId = "SJ-" + Math.floor(10000 + Math.random() * 90000);

        // Format Date nicely
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = new Date(dateVal).toLocaleDateString("en-US", dateOptions);

        // Update receipt markup
        document.getElementById("receipt-number").innerText = "#" + randomReceiptId;
        document.getElementById("receipt-patient-name").innerText = patientName;
        document.getElementById("receipt-patient-phone-row").innerText = patientPhone;
        document.getElementById("receipt-patient-email").innerText = patientEmail;
        document.getElementById("receipt-patient-email-note").innerText = patientEmail;
        document.getElementById("receipt-doctor-name").innerText = doc.name;
        document.getElementById("receipt-doctor-dept").innerText = doc.department;
        document.getElementById("receipt-datetime").innerText = `${formattedDate} @ ${timeSlot}`;

        // Reset Booking Form
        document.getElementById("booking-form").reset();

        // Trigger Confetti Effect
        this.triggerConfetti();

        // Send AWS SNS Notification to Doctor (Toast Simulation)
        this.sendSNSNotification(doc, patientName, patientPhone, formattedDate, timeSlot, randomReceiptId);

        // Send Real Email Notification
        this.sendRealEmailNotification(doc, patientName, patientPhone, patientEmail, formattedDate, timeSlot, randomReceiptId);

        // Switch Modals
        this.closeModal("modal-booking");
        this.openModal("modal-receipt");
    }

    // 5. ADMIN / MANAGEMENT PORTAL LOGIC
    setupAdminView() {
        this.renderAdminSidebar();

        // If there are members, select the first one, else create new doctor
        if (this.doctors.length > 0) {
            this.selectAdminDoctor(this.doctors[0].id);
        } else {
            this.createNewDoctorForm();
        }
    }

    renderAdminSidebar() {
        const listContainer = document.getElementById("admin-doctors-list");
        if (!listContainer) return;

        const adminSearchVal = document.getElementById("admin-search-input").value.toLowerCase();

        const filtered = this.doctors.filter(d =>
            d.name.toLowerCase().includes(adminSearchVal) ||
            d.specialty.toLowerCase().includes(adminSearchVal) ||
            d.department.toLowerCase().includes(adminSearchVal)
        );

        const doctors = filtered.filter(d => d.type === 'doctor' || !d.type);
        const staff = filtered.filter(d => d.type === 'staff');

        let html = '';

        if (doctors.length > 0) {
            html += `<div class="admin-sidebar-section-title">Doctors & Specialists</div>`;
            html += doctors.map(doc => this.renderAdminSidebarItem(doc)).join("");
        }

        if (staff.length > 0) {
            html += `<div class="admin-sidebar-section-title">Support Staff</div>`;
            html += staff.map(st => this.renderAdminSidebarItem(st)).join("");
        }

        if (filtered.length === 0) {
            html = `<div style="padding: 20px; text-align: center; color: var(--text-light); font-size: 13px;">No members found.</div>`;
        }

        listContainer.innerHTML = html;
    }

    renderAdminSidebarItem(doc) {
        const isSelected = doc.id === this.adminSelectedDoctorId;
        const activeClass = isSelected ? "selected" : "";
        const isStaff = doc.type === 'staff';
        const itemClass = isStaff ? "staff-item" : "";

        const avatarHtml = doc.imageUrl
            ? `<img class="admin-list-item-avatar" src="${doc.imageUrl}" alt="">`
            : `<div class="admin-list-item-fallback">${this.getInitials(doc.name) || (isStaff ? 'Staff' : 'Dr')}</div>`;

        return `
            <div class="admin-list-item ${activeClass} ${itemClass}" onclick="app.selectAdminDoctor('${doc.id}')">
                ${avatarHtml}
                <div class="admin-list-item-info">
                    <h4>${doc.name}</h4>
                    <span>${doc.specialty}</span>
                </div>
            </div>
        `;
    }

    adminFilterDoctors() {
        this.renderAdminSidebar();
    }

    selectAdminDoctor(docId) {
        this.adminSelectedDoctorId = docId;

        // Highlight active sidebar item
        document.querySelectorAll(".admin-list-item").forEach(item => {
            item.classList.remove("selected");
        });
        this.renderAdminSidebar(); // Redraws selection state

        const doc = this.doctors.find(d => d.id === docId);
        if (!doc) return;

        // Populate form
        const isStaff = doc.type === 'staff';
        document.getElementById("admin-form-title").innerText = isStaff ? `Edit Staff: ${doc.name}` : `Edit Doctor: ${doc.name}`;
        document.getElementById("form-doctor-id").value = doc.id;
        document.getElementById("form-type").value = doc.type || 'doctor';
        this.onFormTypeChange();

        document.getElementById("form-name").value = doc.name;
        document.getElementById("form-specialty").value = doc.specialty;
        document.getElementById("form-department").value = doc.department;
        document.getElementById("form-image-url").value = doc.imageUrl || "";
        
        const exp = this.getExperienceFromStartDate(doc.experienceStartDate);
        document.getElementById("form-experience-years").value = exp.years;
        document.getElementById("form-experience-months").value = exp.months;
        document.getElementById("form-rating").value = doc.rating;
        document.getElementById("form-phone").value = doc.phone;
        document.getElementById("form-whatsapp").value = doc.whatsapp || "";
        document.getElementById("form-email").value = doc.email;
        document.getElementById("form-clinic-name").value = doc.clinicName;
        document.getElementById("form-address").value = doc.address;
        document.getElementById("form-hours-days").value = doc.hoursDays;
        document.getElementById("form-hours-time").value = doc.hoursTime;

        if (doc.mapUrl) {
            document.getElementById("form-map-url").value = doc.mapUrl;
        } else {
            document.getElementById("form-map-url").value = "";
        }

        // Show delete button for existing members
        document.getElementById("btn-delete-doctor").innerHTML = `<i class="bi bi-trash3-fill"></i> Delete ${isStaff ? 'Staff' : 'Doctor'}`;
        document.getElementById("btn-delete-doctor").style.display = "inline-flex";
    }

    createNewDoctorForm() {
        this.createNewMemberForm('doctor');
    }

    createNewStaffForm() {
        this.createNewMemberForm('staff');
    }

    createNewMemberForm(type) {
        this.adminSelectedDoctorId = null;

        // Remove highlights
        document.querySelectorAll(".admin-list-item").forEach(item => {
            item.classList.remove("selected");
        });
        this.renderAdminSidebar();

        // Reset form to blank template
        document.getElementById("doctor-form").reset();
        document.getElementById("form-doctor-id").value = "";
        document.getElementById("form-type").value = type;
        this.onFormTypeChange();

        document.getElementById("admin-form-title").innerText = type === 'doctor' 
            ? "Add New Medical Specialist" 
            : "Add New Staff Member";

        // Hide delete button for unsaved new entries
        document.getElementById("btn-delete-doctor").style.display = "none";
        document.getElementById("form-name").focus();
    }

    onFormTypeChange() {
        const type = document.getElementById("form-type").value;
        const labelName = document.getElementById("label-form-name");
        const labelSpecialty = document.getElementById("label-form-specialty");
        const inputName = document.getElementById("form-name");
        const inputSpecialty = document.getElementById("form-specialty");
        const groupRating = document.getElementById("group-form-rating");
        const groupMapUrl = document.getElementById("group-form-map-url");
        const labelHoursDays = document.getElementById("label-form-hours-days");
        const labelHoursTime = document.getElementById("label-form-hours-time");
        const inputHoursDays = document.getElementById("form-hours-days");
        const inputHoursTime = document.getElementById("form-hours-time");

        if (type === 'staff') {
            if (labelName) labelName.innerHTML = 'Staff Name <span class="required">*</span>';
            if (inputName) inputName.placeholder = 'e.g. Swati Patil';
            if (labelSpecialty) labelSpecialty.innerHTML = 'Role / Job Title <span class="required">*</span>';
            if (inputSpecialty) inputSpecialty.placeholder = 'e.g. Senior Staff Nurse, Receptionist';
            if (groupRating) groupRating.style.display = 'none';
            if (groupMapUrl) groupMapUrl.style.display = 'none';
            if (labelHoursDays) labelHoursDays.innerHTML = 'Working Days <span class="required">*</span>';
            if (inputHoursDays) inputHoursDays.placeholder = 'e.g. Mon - Sat';
            if (labelHoursTime) labelHoursTime.innerHTML = 'Working Hours <span class="required">*</span>';
            if (inputHoursTime) inputHoursTime.placeholder = 'e.g. 8:00 AM - 4:00 PM';
        } else {
            if (labelName) labelName.innerHTML = 'Doctor Name <span class="required">*</span>';
            if (inputName) inputName.placeholder = 'e.g. Dr. Jane Smith';
            if (labelSpecialty) labelSpecialty.innerHTML = 'Specialty <span class="required">*</span>';
            if (inputSpecialty) inputSpecialty.placeholder = 'e.g. Cardiologist, Pediatrician';
            if (groupRating) groupRating.style.display = 'block';
            if (groupMapUrl) groupMapUrl.style.display = 'block';
            if (labelHoursDays) labelHoursDays.innerHTML = 'Consultation Days <span class="required">*</span>';
            if (inputHoursDays) inputHoursDays.placeholder = 'e.g. Mon - Sat, Mon/Wed/Fri';
            if (labelHoursTime) labelHoursTime.innerHTML = 'Consultation Time Slot <span class="required">*</span>';
            if (inputHoursTime) inputHoursTime.placeholder = 'e.g. 9:00 AM - 1:00 PM, 5:00 PM - 8:00 PM';
        }
    }

    saveDoctorForm(event) {
        event.preventDefault();

        const docId = document.getElementById("form-doctor-id").value;
        const type = document.getElementById("form-type").value;
        const name = document.getElementById("form-name").value;
        const specialty = document.getElementById("form-specialty").value;
        const department = document.getElementById("form-department").value;
        const imageUrl = document.getElementById("form-image-url").value;
        
        const expYears = parseInt(document.getElementById("form-experience-years").value) || 0;
        const expMonths = parseInt(document.getElementById("form-experience-months").value) || 0;
        const experienceStartDate = this.getStartDateFromExperience(expYears, expMonths);
        const experience = this.getExperienceValue(expYears, expMonths);
        
        const rating = parseInt(document.getElementById("form-rating").value) || 5;
        const phone = document.getElementById("form-phone").value;
        const whatsapp = document.getElementById("form-whatsapp").value || phone;
        const email = document.getElementById("form-email").value;
        const clinicName = document.getElementById("form-clinic-name").value;
        const address = document.getElementById("form-address").value;
        const hoursDays = document.getElementById("form-hours-days").value;
        const hoursTime = document.getElementById("form-hours-time").value;
        const mapUrl = document.getElementById("form-map-url").value;

        if (docId) {
            // Edit existing doctor/staff
            const index = this.doctors.findIndex(d => d.id === docId);
            if (index !== -1) {
                this.doctors[index] = {
                    ...this.doctors[index],
                    type, name, specialty, department, imageUrl, experience, rating,
                    phone, whatsapp, email, clinicName, address, hoursDays, hoursTime, mapUrl,
                    experienceStartDate
                };
            }
        } else {
            // Create new doctor/staff
            const prefix = type === 'staff' ? 'staff' : 'doc';
            const cleanNameId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            const uniqueId = `${prefix}-${cleanNameId}-${Date.now().toString().slice(-4)}`;

            const newDoc = {
                id: uniqueId,
                type, name, specialty, department, imageUrl, experience, rating,
                phone, whatsapp, email, clinicName, address, hoursDays, hoursTime, mapUrl,
                experienceStartDate
            };
            this.doctors.push(newDoc);
            this.adminSelectedDoctorId = uniqueId;
        }

        this.saveDoctorsToLocal();
        alert("Details successfully saved!");

        // Reload admin and return to directory (or new card view)
        this.navigateTo("directory");
    }

    deleteDoctor() {
        const docId = document.getElementById("form-doctor-id").value;
        if (!docId) return;

        const doc = this.doctors.find(d => d.id === docId);
        if (!doc) return;

        const isStaff = doc.type === 'staff';
        const confirmDel = confirm(`Are you sure you want to permanently delete the digital card for ${doc.name}?`);
        if (!confirmDel) return;

        // Filter out
        this.doctors = this.doctors.filter(d => d.id !== docId);
        this.saveDoctorsToLocal();

        alert(`${isStaff ? 'Staff card' : 'Doctor card'} removed.`);

        this.navigateTo("directory");
    }

    resetDoctorForm() {
        if (this.adminSelectedDoctorId) {
            this.selectAdminDoctor(this.adminSelectedDoctorId);
        } else {
            const type = document.getElementById("form-type").value || 'doctor';
            this.createNewMemberForm(type);
        }
    }

    // Admin Password Security Flow
    isAdminAuthenticated() {
        return sessionStorage.getItem("admin_authenticated") === "true";
    }

    openAdminLoginModal() {
        document.getElementById("admin-password").value = "";
        document.getElementById("admin-login-error").style.display = "none";
        this.openModal("modal-admin-login");
    }

    authenticateAdmin(event) {
        event.preventDefault();
        const pwd = document.getElementById("admin-password").value;
        if (pwd === "admin123") {
            sessionStorage.setItem("admin_authenticated", "true");
            this.closeModal("modal-admin-login");
            if (this.pendingAdminAction) {
                this.pendingAdminAction();
                this.pendingAdminAction = null;
            }
        } else {
            document.getElementById("admin-login-error").style.display = "block";
            document.getElementById("admin-password").focus();
        }
    }

    logoutAdmin() {
        sessionStorage.removeItem("admin_authenticated");
        alert("You have logged out of the admin panel.");
        this.navigateTo("directory");
    }

    initHomepageFeatures() {
        // Start Live Clock
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);

        // Set default appointment date for homepage form
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().substring(0, 10);
        const homeBookDate = document.getElementById("home-book-date");
        if (homeBookDate) {
            homeBookDate.value = dateStr;
            homeBookDate.min = new Date().toISOString().substring(0, 10); // Prevent past dates
        }

        // Testimonial Carousel Auto Slide
        this.testimonialIndex = 0;
        this.testimonialInterval = setInterval(() => this.nextTestimonial(), 5000);
    }

    updateClock() {
        const clockEl = document.getElementById("header-clock");
        if (clockEl) {
            const now = new Date();
            clockEl.innerText = now.toLocaleTimeString("en-US", {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }
    }

    populateHomepageBookingDoctors() {
        const selectEl = document.getElementById("home-book-doctor");
        if (selectEl) {
            const doctorsOnly = this.doctors.filter(d => d.type === 'doctor' || !d.type);
            const currentSelected = selectEl.value;
            selectEl.innerHTML = `<option value="" disabled ${!currentSelected ? 'selected' : ''}>Choose Doctor...</option>` +
                doctorsOnly.map(doc => `<option value="${doc.id}">${doc.name} (${doc.specialty})</option>`).join("");
            if (currentSelected && doctorsOnly.some(d => d.id === currentSelected)) {
                selectEl.value = currentSelected;
            }
        }
    }

    confirmHomepageBooking(event) {
        event.preventDefault();
        
        const docId = document.getElementById("home-book-doctor").value;
        const doc = this.doctors.find(d => d.id === docId);
        if (!doc) {
            alert("Please select a doctor.");
            return;
        }

        const patientName = document.getElementById("home-book-patient-name").value;
        const patientPhone = document.getElementById("home-book-patient-phone").value;
        const patientEmail = document.getElementById("home-book-patient-email").value;
        const dateVal = document.getElementById("home-book-date").value;
        const timeSlot = "09:30 AM"; // Default morning slot

        // Generate receipt values
        const randomReceiptId = "SJ-" + Math.floor(10000 + Math.random() * 90000);

        // Format Date nicely
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = new Date(dateVal).toLocaleDateString("en-US", dateOptions);

        // Update receipt markup
        document.getElementById("receipt-number").innerText = "#" + randomReceiptId;
        document.getElementById("receipt-patient-name").innerText = patientName;
        document.getElementById("receipt-patient-phone-row").innerText = patientPhone;
        document.getElementById("receipt-patient-email").innerText = patientEmail;
        document.getElementById("receipt-patient-email-note").innerText = patientEmail;
        document.getElementById("receipt-doctor-name").innerText = doc.name;
        document.getElementById("receipt-doctor-dept").innerText = doc.department;
        document.getElementById("receipt-datetime").innerText = `${formattedDate} @ ${timeSlot}`;

        // Reset Homepage Booking Form
        document.getElementById("home-booking-form").reset();
        
        // Re-set default date after reset
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById("home-book-date").value = tomorrow.toISOString().substring(0, 10);

        // Trigger Confetti Effect
        this.triggerConfetti();

        // Send AWS SNS Notification to Doctor (Toast Simulation)
        this.sendSNSNotification(doc, patientName, patientPhone, formattedDate, timeSlot, randomReceiptId);

        // Send Real Email Notification
        this.sendRealEmailNotification(doc, patientName, patientPhone, patientEmail, formattedDate, timeSlot, randomReceiptId);

        // Open Receipt Modal
        this.openModal("modal-receipt");
    }

    triggerConfetti() {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 85,
                origin: { y: 0.6 }
            });
        }
    }

    sendSNSNotification(doctor, patientName, patientPhone, date, timeSlot, receiptId) {
        // Generate unique SNS Message ID
        const messageId = 'sns-msg-' + Math.floor(10000000 + Math.random() * 90000000);
        
        // Ensure email exists or fallback
        const emailAddress = doctor.email || `dr.${doctor.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@swamisamarth.com`;
        
        // Format AWS SNS Publish Payload
        const snsPayload = {
            TopicArn: "arn:aws:sns:us-east-1:123456789012:HospitalAppointments",
            Message: `Dear Dr. ${doctor.name},\n\nA new clinic appointment has been scheduled.\n\n` +
                     `Patient Name: ${patientName}\n` +
                     `Contact: ${patientPhone}\n` +
                     `Date: ${date}\n` +
                     `Time Slot: ${timeSlot}\n` +
                     `Receipt Reference: #${receiptId}\n\n` +
                     `This message has been dispatched via AWS SNS to your registered email: ${emailAddress}.`,
            Subject: `New Appointment: ${patientName} - #${receiptId}`,
            MessageAttributes: {
                "email": {
                    DataType: "String",
                    StringValue: emailAddress
                }
            }
        };

        // Output simulation log in Developer Console
        console.group(`🚀 [AWS SNS Simulator] Publish Notification to ${emailAddress}`);
        console.log(`Endpoint: https://sns.us-east-1.amazonaws.com`);
        console.log(`Status: 200 OK (Message Dispatched)`);
        console.log(`MessageId: ${messageId}`);
        console.log(`Payload Structure:`, snsPayload);
        console.groupEnd();

        // Create and show custom visual toast notification
        const container = document.getElementById("sns-toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = "sns-toast";
        toast.innerHTML = `
            <div class="sns-toast-header">
                <span class="sns-toast-title">
                    <i class="bi bi-cloud-arrow-up-fill"></i> AWS SNS Notification Sent
                </span>
                <button class="sns-toast-close" onclick="this.parentElement.parentElement.remove()"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="sns-toast-body">
                <span>An appointment alert was dispatched via AWS SNS to <strong>Dr. ${doctor.name}</strong>'s registered email:</span>
                <span style="font-weight: 600; color: #ff9900;">${emailAddress}</span>
                <div class="sns-toast-details">Subject: New Appointment: ${patientName}
Ref: #${receiptId}
Date/Time: ${date} @ ${timeSlot}</div>
            </div>
            <div class="sns-toast-footer">
                <span>Message ID: ${messageId.substring(0, 15)}...</span>
                <span class="sns-toast-status-badge">HTTP 200 OK</span>
            </div>
        `;

        container.appendChild(toast);

        // Slide in
        setTimeout(() => toast.classList.add("show"), 100);

        // Auto remove after 6 seconds
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 400);
        }, 6000);
    }

    sendRealEmailNotification(doctor, patientName, patientPhone, patientEmail, date, timeSlot, receiptId) {
        // Fallback to primary hospital email if doctor does not have one
        const doctorEmail = doctor.email || 'drmansingpatil@gmail.com';
        
        // FormSubmit AJAX submission endpoint
        const formSubmitUrl = `https://formsubmit.co/ajax/${doctorEmail}`;
        
        // Construct the body payload
        const emailBody = {
            "Patient Name": patientName,
            "Patient Contact": patientPhone,
            "Patient Email": patientEmail,
            "Appointment Date": date,
            "Time Slot": timeSlot,
            "Receipt Reference": `#${receiptId}`,
            "_subject": `New Appointment Booked: ${patientName} - #${receiptId}`,
            "_replyto": patientEmail,
            "_honey": "", // honeypot spam protection
            "_autoresponse": `Dear ${patientName},\n\n` +
                             `This is a confirmation of your appointment request at Shri Swami Samarth Hospital.\n\n` +
                             `Appointment Details:\n` +
                             `- Specialist: ${doctor.name} (${doctor.specialty})\n` +
                             `- Date: ${date}\n` +
                             `- Time Slot: ${timeSlot}\n` +
                             `- Receipt Reference: #${receiptId}\n\n` +
                             `If you need to reschedule or cancel, please contact the clinic.\n\n` +
                             `Best regards,\n` +
                             `Shri Swami Samarth Hospital Team\n` +
                             `Tel: 9922231315 / 9021751057`
        };

        console.log(`Sending real email request via FormSubmit to doctor's email: ${doctorEmail}...`);

        fetch(formSubmitUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(emailBody)
        })
        .then(response => response.json())
        .then(data => {
            console.log("FormSubmit email sent successfully:", data);
        })
        .catch(err => {
            console.error("FormSubmit email submission error:", err);
        });
    }

    setTestimonial(index) {
        this.testimonialIndex = index;
        const slides = document.querySelectorAll(".testimonial-slide");
        const dots = document.querySelectorAll(".carousel-dot");
        
        slides.forEach((slide, i) => {
            if (i === index) slide.classList.add("active");
            else slide.classList.remove("active");
        });
        
        dots.forEach((dot, i) => {
            if (i === index) dot.classList.add("active");
            else dot.classList.remove("active");
        });

        // Reset auto slide interval when manually changed
        clearInterval(this.testimonialInterval);
        this.testimonialInterval = setInterval(() => this.nextTestimonial(), 5000);
    }

    nextTestimonial() {
        const slides = document.querySelectorAll(".testimonial-slide");
        if (slides.length === 0) return;
        let nextIndex = this.testimonialIndex + 1;
        if (nextIndex >= slides.length) nextIndex = 0;
        this.setTestimonial(nextIndex);
    }

    scrollToSection(elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            if (this.activeView !== "directory") {
                this.navigateTo("directory");
            }
            setTimeout(() => {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }
    }

    scrollToBookingForm(docId) {
        this.scrollToSection('sec-home-appointment');
        const selectEl = document.getElementById("home-book-doctor");
        if (selectEl) {
            selectEl.value = docId;
        }
    }

    isDoctorAvailableToday(hoursDays) {
        if (!hoursDays) return true;
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const todayDayName = days[new Date().getDay()]; // e.g. "Mon"
        
        const lowerDays = hoursDays.toLowerCase();
        // Standard range check for "Mon - Sat"
        if (lowerDays.includes("mon - sat")) {
            return todayDayName !== "Sun";
        }
        if (lowerDays.includes("mon - fri")) {
            return todayDayName !== "Sat" && todayDayName !== "Sun";
        }
        if (lowerDays.includes("everyday") || lowerDays.includes("mon - sun") || lowerDays.includes("daily")) {
            return true;
        }
        // Specific listing check e.g. "mon/wed/fri" or "mon, wed, fri"
        if (lowerDays.includes(todayDayName.toLowerCase())) {
            return true;
        }
        return false;
    }

    logoutAdmin() {
        sessionStorage.removeItem("admin_authenticated");
        alert("You have logged out of the admin panel.");
        this.navigateTo("directory");
    }
}

// 6. INSTANTIATION & ONLOAD
let app;
document.addEventListener("DOMContentLoaded", () => {
    app = new HospitalECardApp();
    app.init();
    // Expose app instance globally so inline HTML onclick calls can access it
    window.app = app;
});
