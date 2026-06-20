from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdf_path = '/Users/gagandeep/Desktop/Medibrick-Pitch-Deck.pdf'

c = canvas.Canvas(pdf_path, pagesize=landscape(A4))
width, height = landscape(A4)

# Colors
HEADER_COLOR = HexColor('#2C3E50')
ACCENT_COLOR = HexColor('#3498DB')
TEXT_COLOR = HexColor('#333333')
LIGHT_BG = HexColor('#F8F9FA')
WHITE = white

def draw_header(c, title):
    """Draw colored header bar with title"""
    # Header background
    c.setFillColor(ACCENT_COLOR)
    c.rect(0, height - 25*mm, width, 25*mm, fill=1, stroke=0)
    # Title text
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 22)
    c.drawString(15*mm, height - 16*mm, title)
    # Bottom line
    c.setStrokeColor(ACCENT_COLOR)
    c.setLineWidth(2)
    c.line(15*mm, height - 25*mm, width - 15*mm, height - 25*mm)

def draw_footer(c, slide_num, total=9):
    """Draw footer with slide number"""
    c.setStrokeColor(HexColor('#DDDDDD'))
    c.setLineWidth(1)
    c.line(15*mm, 12*mm, width - 15*mm, 12*mm)
    c.setFillColor(HexColor('#999999'))
    c.setFont('Helvetica', 9)
    c.drawRightString(width - 15*mm, 7*mm, f'Slide {slide_num} of {total}')
    c.drawString(15*mm, 7*mm, 'Medibrick | June 2026')

def add_slide_title(c, title, subtitle=None):
    """Full-page title slide"""
    # Background
    c.setFillColor(HEADER_COLOR)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    # Main title
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 48)
    c.drawCentredString(width/2, height/2 + 20*mm, title)
    # Subtitle
    if subtitle:
        c.setFont('Helvetica', 24)
        c.drawCentredString(width/2, height/2 - 10*mm, subtitle)

def add_slide_content(c, title, bullets, slide_num):
    """Content slide with header and bullet points"""
    draw_header(c, title)
    
    y = height - 40*mm
    c.setFillColor(TEXT_COLOR)
    
    for item in bullets:
        if item == "":
            y -= 8*mm
            continue
        
        is_header = item.startswith("**") and item.endswith("**")
        is_bullet = item.startswith("• ")
        
        if is_header:
            text = item.strip("**")
            c.setFont('Helvetica-Bold', 16)
            c.setFillColor(HEADER_COLOR)
            c.drawString(20*mm, y, text)
            y -= 10*mm
        elif is_bullet:
            c.setFont('Helvetica', 13)
            c.setFillColor(TEXT_COLOR)
            # Wrap text if too long
            text = item[2:]  # Remove "• "
            words = text.split()
            line = ""
            for word in words:
                test_line = line + " " + word if line else word
                if len(test_line) > 100:
                    c.drawString(25*mm, y, "• " + line)
                    y -= 7*mm
                    line = word
                else:
                    line = test_line
            if line:
                c.drawString(25*mm, y, "• " + line)
                y -= 7*mm
        else:
            c.setFont('Helvetica', 13)
            c.setFillColor(TEXT_COLOR)
            c.drawString(20*mm, y, item)
            y -= 7*mm
        
        y -= 2*mm  # Extra spacing
    
    draw_footer(c, slide_num)

# ==================== SLIDES ====================

# Slide 1: Title
add_slide_title(c, "Medibrick", "Verified Marketplace for Healthcare Shifts")
c.setFont('Helvetica', 16)
c.drawCentredString(width/2, height/2 - 30*mm, "Gagan (Tech) + Arpana (Medical) | June 2026")
draw_footer(c, 1)
c.showPage()

# Slide 2: Problem
add_slide_content(c, "The Problem: Empty Shifts, Stressed Hospitals", [
    "**The Hospital Nightmare**",
    "• Admin confirms a nurse for tomorrow's shift",
    "• Nurse says \"Yes, I'll be there\"",
    "• Morning comes: Nurse doesn't show, doesn't pick up phone",
    "• Hospital short-staffed with 40 patients and zero backup",
    "",
    "**Why It Happens**",
    "• Better offer elsewhere (another hospital pays more last minute)",
    "• Multiple bookings (booked 2-3 places, picked the best)",
    "• Zero penalty for not showing up",
    "• No verification (anyone can say yes)",
    "• Poor communication (no real-time status updates)",
    "",
    "**The Payment Problem**",
    "• Professional completes 12-hour shift",
    "• Waits 2-4 weeks for payment, chases admin",
    "• Gets frustrated, leaves platform, goes back to word-of-mouth"
], 2)
c.showPage()

# Slide 3: Solution
add_slide_content(c, "Medibrick: Verified Locum Marketplace", [
    "**For Hospitals**",
    "• Post shifts, browse verified professionals who show up",
    "• See reviews from other hospitals before selecting",
    "• View professional's track record: completed shifts, ratings",
    "• No more calling 10 people hoping 1 answers",
    "",
    "**For Professionals**",
    "• Flexible shifts, fair pay, build reputation",
    "• Public profile with reviews helps get more shifts",
    "• Rate hospitals on payment speed and treatment",
    "• No more chasing payments for weeks",
    "",
    "**How It Works**",
    "• Hospital posts shift → Professional applies with profile",
    "• Hospital sees verified credentials + reviews → Selects best fit",
    "• Professional confirms → Both parties commit",
    "• Shift completed → Hospital pays directly → Both review each other",
    "• Trust builds over time → Repeat engagements"
], 3)
c.showPage()

# Slide 4: Market
add_slide_content(c, "Market Opportunity", [
    "**India's Healthcare Staffing Gap**",
    "• 700,000+ Ayurvedic practitioners — NO platform serves them",
    "• 2.5M+ nurses — fragmented, offline hiring only",
    "• Diagnostic chains need temp technicians for peak hours",
    "• Small clinics (10-50 beds) ignored by large platforms",
    "• Nursing homes need flexible staffing for weekends/nights",
    "",
    "**Phase 1 Cities (Next 12 Months)**",
    "• Bengaluru (HQ) → Hyderabad → Chennai → Mumbai → Delhi → Pune",
    "",
    "**Market Size**",
    "• TAM: ₹2,000 Cr+ (healthcare temp staffing in India)",
    "• SAM: ₹500 Cr+ (locum staffing in 6 metro cities)",
    "• SOM: ₹50 Cr+ (Year 1 target: Bengaluru + Hyderabad)"
], 4)
c.showPage()

# Slide 5: Competition
add_slide_content(c, "Why Now? Why Us?", [
    "**Jobizo.com (Current Leader)**",
    "• 10M+ shifts, 150+ hospitals, 60K+ professionals",
    "• Allopathic doctors only, job-seeker first, hospitals only",
    "• No review system, no transparency into reliability",
    "",
    "**Medibrick's Advantage**",
    "• Institution-first: Hospital posts need, professionals apply",
    "• Allopathic + AYUSH + nurses + technicians + therapists",
    "• Hospitals + clinics + diagnostic + wellness + Ayurvedic centers",
    "• Public reviews build trust without forcing deposits",
    "• Hospitals handle payment directly — no platform delay or hold",
    "",
    "**Our Strategy**",
    "• Don't compete head-to-head on allopathic doctors",
    "• Own the gaps: Ayurvedic, nursing, technicians, small clinics",
    "• Build density in Bengaluru first, then expand"
], 5)
c.showPage()

# Slide 6: Business Model
add_slide_content(c, "Business Model", [
    "**Phase 1: Free to Onboard (Months 1-6)**",
    "• Hospitals: Free to post shifts, free to browse professionals",
    "• Professionals: Free to join, free to apply, free profile",
    "• Goal: Build density — 100 hospitals, 1000 professionals",
    "• Reviews and trust are the currency, not money",
    "",
    "**Phase 2: Monetize Trust (Month 6+)**",
    "• Premium listings for hospitals: Featured shifts, priority matching",
    "• Verified badge for professionals: Background check, skills test",
    "• Analytics dashboard: Staffing patterns, peak demand forecasting",
    "• Subscription: ₹5,000/month for unlimited shifts + insights",
    "",
    "**Payment Flow**",
    "• Hospital pays professional directly (cash, bank transfer, UPI)",
    "• Platform stays neutral — no holding money, no delay",
    "• Reviews keep everyone honest: late payment = bad hospital rating"
], 6)
c.showPage()

# Slide 7: Status
add_slide_content(c, "Current Status", [
    "**Built & Working**",
    "• Landing page (medibrick.com)",
    "• Database (Supabase PostgreSQL)",
    "• Shift posting + application flow",
    "• Public profile pages with reviews visible",
    "",
    "**In Development**",
    "• Review system (post-shift bilateral ratings)",
    "• WhatsApp notifications for shift updates",
    "• Mobile-responsive improvements",
    "",
    "**Next 30 Days**",
    "• Target: Onboard 5 Bengaluru hospitals for pilot",
    "• Target: Verify and onboard 50 professionals",
    "• Collect feedback, iterate, refine",
    "",
    "**Team**",
    "• Gagan: Tech + Operations (Software Engineer, 5+ years)",
    "• Arpana: Medical Strategy + Hospital Sales (Healthcare Background)"
], 7)
c.showPage()

# Slide 8: Accelerator Ask
add_slide_content(c, "What We're Looking For", [
    "**From This Accelerator**",
    "• Hospital Network: Warm introductions to Bengaluru hospitals",
    "• Mentorship: Guidance from healthcare industry experts",
    "• Credibility: Association helps with hospital trust",
    "• Learning: Best practices from other healthcare startups",
    "• Peer Network: Fellow founders facing similar challenges",
    "",
    "**What We Bring**",
    "• Technical execution: Product built and iterating fast",
    "• Medical credibility: Arpana's healthcare background and network",
    "• Clear problem: 30-40% no-show rate is real and painful",
    "• Differentiated approach: Own the gaps Jobizo ignores",
    "",
    "**Use of Support**",
    "• Product: Complete review system, mobile app",
    "• Growth: Hospital acquisition, professional onboarding",
    "• Operations: Hire customer success for hospital handholding"
], 8)
c.showPage()

# Slide 9: Vision
c.setFillColor(HEADER_COLOR)
c.rect(0, 0, width, height, fill=1, stroke=0)

c.setFillColor(WHITE)
c.setFont('Helvetica-Bold', 44)
c.drawCentredString(width/2, height/2 + 25*mm, "Vision")

c.setFont('Helvetica', 22)
c.drawCentredString(width/2, height/2 - 5*mm, "Every empty shift in India filled.")
c.drawCentredString(width/2, height/2 - 20*mm, "Every healthcare professional treated fairly.")

c.setFont('Helvetica-Bold', 26)
c.setFillColor(ACCENT_COLOR)
c.drawCentredString(width/2, height/2 - 50*mm, "Starting with Bengaluru.")

c.setFillColor(WHITE)
c.setFont('Helvetica', 14)
c.drawCentredString(width/2, height/2 - 80*mm, "Gagan + Arpana | medibrick.com")

draw_footer(c, 9)
c.showPage()

c.save()
print(f'✅ Created: {pdf_path}')
print(f'📄 Pages: 9')
print(f'📐 Size: Landscape A4')
