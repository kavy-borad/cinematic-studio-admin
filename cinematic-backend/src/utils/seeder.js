const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Quotation = require("../models/Quotation");
const Portfolio = require("../models/Portfolio");
const Service = require("../models/Service");
const Client = require("../models/Client");
const Testimonial = require("../models/Testimonial");

async function seedDatabase() {
    try {
        // ── Admin User ──────────────────────────────────────────────
        const existingAdmin = await User.findOne({ where: { email: "admin@pixcelstudio.com" } });
        if (!existingAdmin) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash("Admin@123", salt);
            await User.create({
                username: "Cinematic Frame Admin",
                email: "admin@pixcelstudio.com",
                password: hashedPassword,
                role: "admin",
            });
            console.log("✅ Admin user seeded");
        }

        // ── Quotations ──────────────────────────────────────────────
        const qCount = await Quotation.count();
        if (qCount === 0) {
            await Quotation.bulkCreate([
                { name: "Priya Sharma", email: "priya@email.com", phone: "+91 98765 43210", city: "Delhi", eventType: "Wedding Photography", eventDate: "2026-02-20", venue: "Taj Palace, Delhi", guestCount: "200-300", servicesRequested: ["Photography", "Cinematic Video"], budget: "₹1,50,000", requirements: "Looking for full-day coverage with drone shots.", status: "New" },
                { name: "Rahul Verma", email: "rahul@email.com", phone: "+91 87654 32109", city: "Jaipur", eventType: "Pre-Wedding Shoot", eventDate: "2026-02-18", venue: "Amer Fort, Jaipur", guestCount: "2", servicesRequested: ["Photography"], budget: "₹45,000", requirements: "Wants outdoor locations in Jaipur.", status: "Contacted" },
                { name: "Anita Desai", email: "anita@email.com", phone: "+91 76543 21098", city: "Mumbai", eventType: "Corporate Event", eventDate: "2026-02-15", venue: "Hyatt Regency", guestCount: "500+", servicesRequested: ["Photography", "Video"], budget: "₹80,000", requirements: "Annual conference, 2 days coverage.", status: "Booked" },
                { name: "Vikram Singh", email: "vikram@email.com", phone: "+91 65432 10987", city: "Delhi", eventType: "Wedding + Reception", eventDate: "2026-02-12", venue: "ITC Grand Bharat", guestCount: "300-500", servicesRequested: ["Photography", "Cinematic Video", "Drone"], budget: "₹2,00,000", requirements: "Premium package with cinematic video.", status: "New" },
                { name: "Meera Joshi", email: "meera@email.com", phone: "+91 54321 09876", city: "Pune", eventType: "Birthday Party", eventDate: "2026-02-10", venue: "Home", guestCount: "30-50", servicesRequested: ["Photography"], budget: "₹30,000", requirements: "Kids birthday, indoor venue.", status: "Contacted" },
                { name: "Arjun Reddy", email: "arjun@email.com", phone: "+91 43210 98765", city: "Hyderabad", eventType: "Engagement Ceremony", eventDate: "2026-02-08", venue: "Falaknuma Palace", guestCount: "50", servicesRequested: ["Photography", "Video"], budget: "₹60,000", requirements: "Small intimate gathering, 50 guests.", status: "Booked" },
            ]);
            console.log("✅ Quotations seeded");
        }

        // ── Portfolio ────────────────────────────────────────────────
        const pCount = await Portfolio.count();
        if (pCount === 0) {
            await Portfolio.bulkCreate([
                { title: "Priya & Arjun Wedding", category: "Weddings", clientName: "Priya & Arjun", eventDate: "2026-01-20", featured: true, photoCount: 248 },
                { title: "Neha Maternity", category: "Portraits", clientName: "Neha Kapoor", eventDate: "2026-01-10", featured: false, photoCount: 65 },
                { title: "TechCorp Annual Meet", category: "Corporate", clientName: "TechCorp India", eventDate: "2025-12-15", featured: false, photoCount: 120 },
                { title: "Raj & Simran Pre-Wedding", category: "Pre-Wedding", clientName: "Raj & Simran", eventDate: "2026-01-05", featured: true, photoCount: 85 },
                { title: "Diwali Gala 2025", category: "Events", clientName: "Event Org", eventDate: "2025-11-12", featured: false, photoCount: 190 },
                { title: "Aisha & Kabir Sangeet", category: "Weddings", clientName: "Aisha & Kabir", eventDate: "2025-12-28", featured: true, photoCount: 150 },
                { title: "Startup Summit Delhi", category: "Corporate", clientName: "Startup India", eventDate: "2025-11-20", featured: false, photoCount: 95 },
                { title: "Baby Aryan First Birthday", category: "Events", clientName: "Aryan Family", eventDate: "2025-12-01", featured: false, photoCount: 72 },
            ]);
            console.log("✅ Portfolio seeded");
        }

        // ── Services ────────────────────────────────────────────────
        const sCount = await Service.count();
        if (sCount === 0) {
            await Service.bulkCreate([
                { name: "Wedding Photography", description: "Full-day coverage with 2 photographers", icon: "Camera", price: 75000, duration: "8-10 hrs", popular: true },
                { name: "Cinematic Video", description: "4K cinematic wedding film with highlights", icon: "Video", price: 60000, duration: "Full day", popular: true },
                { name: "Drone Coverage", description: "Aerial shots and video for outdoor events", icon: "Plane", price: 25000, duration: "3-4 hrs", popular: false },
                { name: "Pre-Wedding Shoot", description: "Creative couple shoot at chosen location", icon: "Camera", price: 35000, duration: "4-5 hrs", popular: false },
                { name: "Portrait Session", description: "Studio or outdoor individual/family portraits", icon: "Camera", price: 15000, duration: "2-3 hrs", popular: false },
                { name: "Event Coverage", description: "Corporate events, parties, conferences", icon: "Camera", price: 40000, duration: "5-6 hrs", popular: false },
                // Packages
                { name: "Silver Package", description: "Wedding Photography + 200 Edited Photos + Online Gallery", icon: "Camera", price: 85000, duration: "Full day", popular: false, packageName: "Silver", features: ["Wedding Photography", "200+ Edited Photos", "Online Gallery", "1 Photographer"] },
                { name: "Gold Package", description: "Photography + Video + 400 Photos + Highlight Reel", icon: "Camera", price: 150000, duration: "Full day", popular: true, packageName: "Gold", features: ["Wedding Photography", "Cinematic Video", "400+ Edited Photos", "2 Photographers", "Highlight Reel"] },
                { name: "Platinum Package", description: "Everything + Drone + Pre-Wedding + Same-Day Edit + Album", icon: "Camera", price: 250000, duration: "Multi-day", popular: false, packageName: "Platinum", features: ["Everything in Gold", "Drone Coverage", "Pre-Wedding Shoot", "Same-Day Edit", "Premium Album"] },
            ]);
            console.log("✅ Services seeded");
        }


        // ── Testimonials ────────────────────────────────────────────
        const tCount = await Testimonial.count();
        if (tCount === 0) {
            await Testimonial.bulkCreate([
                { name: "Priya Sharma", event: "Wedding Photography", rating: 5, text: "Absolutely stunning work! Every frame was like a piece of art. The team captured our special moments beautifully.", approved: true },
                { name: "Rahul Verma", event: "Pre-Wedding Shoot", rating: 5, text: "The creativity and attention to detail was incredible. Our pre-wedding photos look like they're from a magazine!", approved: true },
                { name: "Anita Desai", event: "Corporate Event", rating: 4, text: "Professional and punctual. The photos perfectly captured the energy of our annual conference.", approved: true },
                { name: "Vikram Singh", event: "Wedding + Reception", rating: 5, text: "Cinematic Frame went above and beyond. The cinematic video brought tears to our eyes. Highly recommend!", approved: false },
                { name: "Meera Joshi", event: "Birthday Party", rating: 4, text: "Great team to work with! They made everyone comfortable and captured genuine smiles and laughter.", approved: false },
                { name: "Kavita Nair", event: "Maternity Shoot", rating: 5, text: "Such a beautiful and memorable experience. The photos are ethereal and I'll treasure them forever.", approved: true },
            ]);
            console.log("✅ Testimonials seeded");
        }

        console.log("🎉 Database seeding complete!");
    } catch (error) {
        console.error("❌ Seeding error:", error.message);
    }
}

module.exports = seedDatabase;
