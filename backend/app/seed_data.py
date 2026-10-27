import datetime
from sqlalchemy.orm import Session
from app.models import (
    Organization, User, SourceDocument, SourcePassage, Rule,
    ContentItem, ContentRevision, Finding, Comment, ApprovalDecision, AuditEvent
)

def seed_demo_database(db: Session) -> dict:
    """
    Seeds the persistent SQLite database with the fictional Acme Courier brand kit,
    approved facts, registered claims, terminology rules, sample content items in different lifecycle states,
    and audit log entries.
    """
    # Check if already seeded
    org = db.query(Organization).filter_by(name="Acme Courier").first()
    if org:
        return {"status": "already_seeded", "org_id": org.id, "message": "Demo data is already loaded in the database."}

    # 1. Create Organization
    org = Organization(name="Acme Courier", created_at=datetime.datetime.utcnow())
    db.add(org)
    db.flush()

    # 2. Seed Team Dashing Cars demo users with their specified roles
    users = [
        User(org_id=org.id, name="Anushka Tambore", email="anushka@acmecourier.com", role="creator"),
        User(org_id=org.id, name="Jayshree Gore", email="jayshree@acmecourier.com", role="reviewer"),
        User(org_id=org.id, name="Kshitija Kolkar", email="kshitija@acmecourier.com", role="brand_manager"),
        User(org_id=org.id, name="Sahil Sakhare", email="sahil@acmecourier.com", role="admin"),
    ]
    db.add_all(users)
    db.flush()

    # 3. Source Documents and Passages
    # Doc 1: Brand Guidelines v2.1
    doc_guidelines = SourceDocument(
        org_id=org.id,
        title="Acme Courier Brand Identity & Guidelines v2.1",
        document_type="guidelines",
        version="2.1",
        confidentiality="internal",
        file_name="Acme_Brand_Guidelines_v2.1.pdf",
        uploaded_by="Kshitija Kolkar (Brand Manager)",
        raw_text="Acme Courier brand standards manual defining company voice, approved terminology, and typography rules."
    )
    db.add(doc_guidelines)
    db.flush()

    p101 = SourcePassage(
        source_id=doc_guidelines.id,
        passage_identifier="P-101",
        section_title="1. Core Brand Voice & Tone",
        text="Acme Courier communicates with reliability, modern clarity, and respect. We never use condescending language, aggressive urgency, or informal slang such as 'gonna' or 'wanna'. All communications must project calm competence.",
        position=1
    )
    p102 = SourcePassage(
        source_id=doc_guidelines.id,
        passage_identifier="P-102",
        section_title="2. Approved Product Names",
        text="Our premier expedited courier product is named 'Acme SwiftDelivery™'. The legacy term 'Acme Express' is discontinued and must not appear in any public communications. Our physical collection centers are called 'Acme Hubs', not 'dropoff points'.",
        position=2
    )
    p103 = SourcePassage(
        source_id=doc_guidelines.id,
        passage_identifier="P-103",
        section_title="3. Partner Terminology",
        text="Our frontline drivers and dispatchers are always referred to respectfully as 'Delivery Partners' or 'Acme Logistics Specialists'. The terms 'courier guy', 'delivery boy', or 'driver guy' are strictly prohibited.",
        position=3
    )
    p104 = SourcePassage(
        source_id=doc_guidelines.id,
        passage_identifier="P-104",
        section_title="4. Value and Pricing Language",
        text="Acme positions itself on dependable service and honest value. We never describe our rates as 'cheap', 'dirt cheap', or 'rock-bottom'. Approved phrasing includes 'competitive rates' or 'value-driven logistics'.",
        position=4
    )
    db.add_all([p101, p102, p103, p104])

    # Doc 2: Approved Claims Register v2.1
    doc_claims = SourceDocument(
        org_id=org.id,
        title="Approved Claims Register v2.1",
        document_type="claims",
        version="2.1",
        confidentiality="public",
        file_name="Approved_Claims_Register_v2.1.docx",
        uploaded_by="Sahil Sakhare (Admin)",
        raw_text="Authoritative legal register of substantiable claims, warranties, and comparative advertising limits."
    )
    db.add(doc_claims)
    db.flush()

    clm318 = SourcePassage(
        source_id=doc_claims.id,
        passage_identifier="P-318",
        section_title="3. Promotional Claims and Superlatives",
        text="Superlative claims such as 'India's #1', 'fastest', or 'best' must not be used in external media without formal certification. No registry entry supports 'fastest' or '#1' in nationwide transit speed.",
        position=1
    )
    clm304 = SourcePassage(
        source_id=doc_claims.id,
        passage_identifier="CLM-3.4",
        section_title="3.4 Approved Speed Claim",
        text="Approved claim 3.4: 'Acme delivers within 24 hours across 40 major cities in India.' This metric has been verified and legally cleared for print, social, and web advertising.",
        position=2
    )
    pol52 = SourcePassage(
        source_id=doc_claims.id,
        passage_identifier="POL-5.2",
        section_title="5. Warranty and Guarantees Policy",
        text="Absolute guarantees such as '100% safe', 'guaranteed zero delay', or 'no questions asked refund' are unlawful under consumer protection guidelines. Approved statement: 'Covered by Acme SafeTransit™ shipment protection.'",
        position=3
    )
    db.add_all([clm318, clm304, pol52])

    # Doc 3: Corporate Fact Sheet 2026
    doc_facts = SourceDocument(
        org_id=org.id,
        title="Acme Verified Corporate Fact Sheet 2026",
        document_type="fact_sheet",
        version="1.0",
        confidentiality="internal",
        file_name="Acme_Corporate_Facts_2026.txt",
        uploaded_by="Kshitija Kolkar (Brand Manager)",
        raw_text="Certified corporate operational metrics, network footprint, and founding history."
    )
    db.add(doc_facts)
    db.flush()

    fact01 = SourcePassage(
        source_id=doc_facts.id,
        passage_identifier="FACT-01",
        section_title="1. Founding and Corporate History",
        text="Acme Courier was founded in 2018 in Pune, India. It began operations with a fleet of 20 electric delivery vans.",
        position=1
    )
    fact02 = SourcePassage(
        source_id=doc_facts.id,
        passage_identifier="FACT-02",
        section_title="2. Hub Network and City Coverage",
        text="As of Q1 2026, Acme operates in exactly 40 major metropolitan cities across India, supported by 5 regional sorting hubs and 112 local Acme Hubs.",
        position=2
    )
    fact03 = SourcePassage(
        source_id=doc_facts.id,
        passage_identifier="FACT-03",
        section_title="3. Performance Track Record",
        text="Audited on-time delivery rate is 99.4% for intra-city parcels and 98.2% for inter-city express shipments.",
        position=3
    )
    db.add_all([fact01, fact02, fact03])

    # Doc 4: Accessibility Guide
    doc_acc = SourceDocument(
        org_id=org.id,
        title="Digital Accessibility Standards v1.2",
        document_type="guidelines",
        version="1.2",
        confidentiality="public",
        file_name="Accessibility_Guidelines.txt",
        uploaded_by="Sahil Sakhare (Admin)",
        raw_text="WCAG 2.1 compliance checklist for all customer-facing digital copy, links, and media."
    )
    db.add(doc_acc)
    db.flush()

    acc01 = SourcePassage(
        source_id=doc_acc.id,
        passage_identifier="ACC-01",
        section_title="1. Alternative Text for Visual Media",
        text="All image references must provide meaningful alternative text describing the content or function of the image.",
        position=1
    )
    acc04 = SourcePassage(
        source_id=doc_acc.id,
        passage_identifier="ACC-04",
        section_title="4. Meaningful Hyperlink Phrasing",
        text="Hyperlink text must describe the destination or action. Generic terms such as 'click here', 'read more', or 'link' violate accessibility standards.",
        position=2
    )
    db.add_all([acc01, acc04])
    db.flush()

    # 4. Seed Rules
    rules = [
        Rule(
            rule_id="BG-CLM-004",
            org_id=org.id,
            category="claims",
            severity="high",
            title="Superlative Claims Verification",
            description="Superlatives like '#1', 'fastest', or 'best' must be substantiated in the Approved Claims Register.",
            examples_do_json='["Acme delivers within 24 hours in 40 cities."]',
            examples_dont_json='["Acme is India\'s #1 fastest courier.", "The best delivery in the country."]',
            source_passage_identifier="P-318",
            source_title="Approved Claims Register v2.1",
            status="active",
            pattern=r"(?i)\b(India's\s+#1|#1\s+fastest|fastest\s+delivery|best\s+courier)\b",
            replacement_suggestion="Acme delivers within 24 hours in 40 cities.",
            created_by="Kshitija Kolkar",
            approved_by="Kshitija Kolkar"
        ),
        Rule(
            rule_id="BG-CLM-002",
            org_id=org.id,
            category="claims",
            severity="high",
            title="Absolute Guarantees Prohibition",
            description="Absolute guarantees such as '100% safe' or 'zero delay guaranteed' are prohibited by advertising policy.",
            examples_do_json='["Protected by Acme SafeTransit™ shipment protection."]',
            examples_dont_json='["100% safe arrival guaranteed.", "Zero delay guaranteed or full refund."]',
            source_passage_identifier="POL-5.2",
            source_title="Approved Claims Register v2.1",
            status="active",
            pattern=r"(?i)\b(100%\s+safe|100%\s+guaranteed|zero\s+delay\s+guaranteed|no\s+questions\s+asked\s+refund)\b",
            replacement_suggestion="Protected by Acme SafeTransit™ shipment protection.",
            created_by="Kshitija Kolkar",
            approved_by="Kshitija Kolkar"
        ),
        Rule(
            rule_id="BG-TRM-001",
            org_id=org.id,
            category="terminology",
            severity="high",
            title="Frontline Partner Terminology",
            description="Always refer to delivery personnel as 'Delivery Partner', never 'courier guy' or 'delivery boy'.",
            examples_do_json='["Our Delivery Partner will arrive between 2 and 4 PM."]',
            examples_dont_json='["The courier guy is at your doorstep."]',
            source_passage_identifier="P-103",
            source_title="Brand Guidelines v2.1",
            status="active",
            pattern=r"(?i)\b(courier\s+guy|delivery\s+boy|driver\s+guy)\b",
            replacement_suggestion="Delivery Partner",
            created_by="Kshitija Kolkar",
            approved_by="Kshitija Kolkar"
        ),
        Rule(
            rule_id="BG-TRM-002",
            org_id=org.id,
            category="terminology",
            severity="medium",
            title="Official Service Brand: Acme SwiftDelivery™",
            description="The legacy service name 'Acme Express' is retired. Use 'Acme SwiftDelivery™'.",
            examples_do_json='["Book an Acme SwiftDelivery™ parcel today."]',
            examples_dont_json='["Ship with Acme Express."]',
            source_passage_identifier="P-102",
            source_title="Brand Guidelines v2.1",
            status="active",
            pattern=r"(?i)\b(Acme\s+Express)\b",
            replacement_suggestion="Acme SwiftDelivery™",
            created_by="Kshitija Kolkar",
            approved_by="Kshitija Kolkar"
        ),
        Rule(
            rule_id="BG-TRM-003",
            org_id=org.id,
            category="terminology",
            severity="medium",
            title="Premium Value Positioning (No 'Cheap')",
            description="Never use 'cheap', 'dirt cheap', or 'rock-bottom' to describe Acme pricing.",
            examples_do_json='["Enjoy competitive, transparent pricing."]',
            examples_dont_json='["We offer dirt cheap rates."]',
            source_passage_identifier="P-104",
            source_title="Brand Guidelines v2.1",
            status="active",
            pattern=r"(?i)\b(dirt\s+cheap|cheap\s+rates|cheap\s+delivery|rock-bottom\s+rates)\b",
            replacement_suggestion="affordable, transparent rates",
            created_by="Kshitija Kolkar",
            approved_by="Kshitija Kolkar"
        ),
        Rule(
            rule_id="BG-TRM-004",
            org_id=org.id,
            category="terminology",
            severity="low",
            title="Facility Naming: Acme Hub",
            description="Physical centers must be named 'Acme Hub', not 'dropoff point' or 'collection depot'.",
            examples_do_json='["Drop your parcel at the nearest Acme Hub."]',
            examples_dont_json='["Visit our dropoff point."]',
            source_passage_identifier="P-102",
            source_title="Brand Guidelines v2.1",
            status="active",
            pattern=r"(?i)\b(dropoff\s+point|drop-off\s+point|collection\s+depot)\b",
            replacement_suggestion="Acme Hub",
            created_by="Kshitija Kolkar",
            approved_by="Kshitija Kolkar"
        ),
        Rule(
            rule_id="BG-FACT-001",
            org_id=org.id,
            category="factual",
            severity="high",
            title="Network City Coverage",
            description="Acme operates across 40 major cities. Exaggerated counts (e.g. 500+ cities) violate verified corporate facts.",
            examples_do_json='["Delivering across 40 major cities in India."]',
            examples_dont_json='["Serving over 500 cities nationwide."]',
            source_passage_identifier="FACT-02",
            source_title="Corporate Fact Sheet 2026",
            status="active",
            pattern=r"(?i)\b(?:over|more than)?\s*(?:500|600|1000)\s*cities\b",
            replacement_suggestion="across 40 major cities",
            created_by="Kshitija Kolkar",
            approved_by="Kshitija Kolkar"
        ),
        Rule(
            rule_id="BG-TONE-001",
            org_id=org.id,
            category="tone",
            severity="medium",
            title="Empathy and Professional Courtesy",
            description="Avoid confrontational, condescending, or aggressively urgent phrasing.",
            examples_do_json='["We are happy to clarify your booking."]',
            examples_dont_json='["You should have known our shipping schedule.", "Obviously our vans are prompt."]',
            source_passage_identifier="P-101",
            source_title="Brand Guidelines v2.1",
            status="active",
            pattern=r"(?i)\b(you\s+should\s+have\s+known|obviously|hurry\s+up\s+before\s+it's\s+gone)\b",
            replacement_suggestion="we are here to assist with your shipment",
            created_by="Kshitija Kolkar",
            approved_by="Kshitija Kolkar"
        ),
        Rule(
            rule_id="BG-ACC-001",
            org_id=org.id,
            category="accessibility",
            severity="low",
            title="Descriptive Link Text",
            description="Anchor links must clearly describe the target destination to ensure WCAG 2.1 screen reader compliance.",
            examples_do_json='["View Acme parcel rates and delivery timelines."]',
            examples_dont_json='["Click here for rates."]',
            source_passage_identifier="ACC-04",
            source_title="Digital Accessibility Standards v1.2",
            status="active",
            pattern=r"(?i)\b(click\s+here|read\s+more|tap\s+here)\b",
            replacement_suggestion="Explore our verified shipping network",
            created_by="Sahil Sakhare",
            approved_by="Kshitija Kolkar"
        ),
        # Seed an extracted rule in 'draft' status to demonstrate Brand Manager approval workflow!
        Rule(
            rule_id="BG-EXTRACT-001",
            org_id=org.id,
            category="tone",
            severity="low",
            title="Proposed: Restrict Informal Contraction 'gonna'",
            description="Newly extracted rule from Guideline section 1: Replace 'gonna' with 'going to' in customer-facing emails.",
            examples_do_json='["We are going to expedite your package."]',
            examples_dont_json='["We are gonna expedite your package."]',
            source_passage_identifier="P-101",
            source_title="Brand Guidelines v2.1",
            status="draft",  # Inactive until Brand Manager approves!
            pattern=r"(?i)\bgonna\b",
            replacement_suggestion="going to",
            created_by="AI Rule Extractor",
            approved_by=None
        )
    ]
    db.add_all(rules)
    db.flush()

    # 5. Pre-seeded Content Items across different lifecycle states

    # Item 1: Ready to review right now (Draft)
    item_launch = ContentItem(
        org_id=org.id,
        title="Social Post: Festival Launch Announcement",
        content_type="social_post",
        audience="General Public & E-commerce Merchants",
        status="draft",
        created_by="Anushka Tambore (Creator)"
    )
    db.add(item_launch)
    db.flush()

    rev1_text = (
        "Acme is India's #1 fastest delivery service! We guarantee 100% safe arrival with zero delay guaranteed. "
        "Founded in 2012, our courier guy delivers to over 500 cities at dirt cheap rates. "
        "Click here to book your delivery now!"
    )
    rev1 = ContentRevision(
        content_id=item_launch.id,
        revision_no=1,
        text=rev1_text,
        author_name="Anushka Tambore",
        notes="First draft of Diwali campaign post"
    )
    db.add(rev1)
    db.flush()
    item_launch.current_revision_id = rev1.id

    # Item 2: Needs Changes (Author Resolves findings)
    item_festival = ContentItem(
        org_id=org.id,
        title="Email: Diwali Merchant Express Discount",
        content_type="email",
        audience="Small Business Sellers",
        status="needs_changes",
        created_by="Anushka Tambore (Creator)"
    )
    db.add(item_festival)
    db.flush()

    rev_fest = ContentRevision(
        content_id=item_festival.id,
        revision_no=1,
        text="Ship with Acme Express today! We offer dirt cheap rates and guaranteed delivery within 24 hours.",
        author_name="Anushka Tambore",
        notes="Diwali campaign blast"
    )
    db.add(rev_fest)
    db.flush()
    item_festival.current_revision_id = rev_fest.id

    # Attach findings for item 2
    f1 = Finding(
        finding_id="F-0101",
        revision_id=rev_fest.id,
        category="terminology",
        start_char=10,
        end_char=22,
        flagged_text="Acme Express",
        rule_id="BG-TRM-002",
        rule_description="The legacy service name 'Acme Express' is retired. Use 'Acme SwiftDelivery™'.",
        evidence_source="Brand Guidelines v2.1, Section 2",
        evidence_passage_id="P-102",
        reason="Violates rule BG-TRM-002: Inconsistent product name. The service 'Acme Express' was rebranded.",
        severity="medium",
        confidence_level="high",
        confidence_basis_json='["pattern_match", "rule_definition"]',
        suggestion="Acme SwiftDelivery™",
        author_action="accepted"
    )
    f2 = Finding(
        finding_id="F-0102",
        revision_id=rev_fest.id,
        category="terminology",
        start_char=39,
        end_char=49,
        flagged_text="dirt cheap",
        rule_id="BG-TRM-003",
        rule_description="Never use 'cheap', 'dirt cheap', or 'rock-bottom' to describe Acme pricing.",
        evidence_source="Brand Guidelines v2.1, Section 4",
        evidence_passage_id="P-104",
        reason="Violates rule BG-TRM-003: 'dirt cheap' undermines brand value.",
        severity="medium",
        confidence_level="high",
        confidence_basis_json='["pattern_match", "rule_definition"]',
        suggestion="affordable, transparent rates",
        author_action="pending"
    )
    db.add_all([f1, f2])

    comm1 = Comment(
        content_id=item_festival.id,
        revision_no=1,
        author_name="Jayshree Gore",
        author_role="reviewer",
        body="Please replace 'dirt cheap' before we can submit this to compliance. Otherwise looks great!"
    )
    db.add(comm1)

    # Item 3: Pending Human Review (In Review Queue!)
    item_brochure = ContentItem(
        org_id=org.id,
        title="Brochure: B2B Enterprise Supply Chain Solutions",
        content_type="brochure",
        audience="Enterprise Logistics Executives",
        status="pending_human_review",
        created_by="Anushka Tambore (Creator)"
    )
    db.add(item_brochure)
    db.flush()

    rev_brochure = ContentRevision(
        content_id=item_brochure.id,
        revision_no=2,
        text="Acme delivers within 24 hours across 40 major cities. Protected by Acme SafeTransit™ shipment protection, our dedicated Delivery Partners ensure 99.4% audited on-time reliability. Explore our corporate parcel rates.",
        author_name="Anushka Tambore",
        notes="Revision 2: Addressed all compliance findings from Rev 1"
    )
    db.add(rev_brochure)
    db.flush()
    item_brochure.current_revision_id = rev_brochure.id

    # Item 4: Approved Item
    item_approved = ContentItem(
        org_id=org.id,
        title="Newsletter: Q4 Customer Update & Green Fleet Expansion",
        content_type="email",
        audience="Existing Customers",
        status="approved",
        created_by="Anushka Tambore (Creator)"
    )
    db.add(item_approved)
    db.flush()

    rev_app = ContentRevision(
        content_id=item_approved.id,
        revision_no=1,
        text="Acme Courier is proud to announce the addition of 50 new electric delivery vans to our green fleet across 40 major cities. Protected by Acme SafeTransit™, our Delivery Partners maintain a 99.4% on-time record.",
        author_name="Anushka Tambore",
        notes="Final reviewed copy"
    )
    db.add(rev_app)
    db.flush()
    item_approved.current_revision_id = rev_app.id

    dec1 = ApprovalDecision(
        content_id=item_approved.id,
        revision_no=1,
        decision="approved",
        reviewer_name="Jayshree Gore",
        reviewer_role="reviewer",
        reason="All factual claims, product terminology, and warranty statements strictly comply with Brand Guidelines v2.1 and Claims Register v2.1."
    )
    db.add(dec1)

    # 6. Audit Events
    audit_events = [
        AuditEvent(
            org_id=org.id,
            actor_name="Sahil Sakhare",
            actor_role="admin",
            action="source_uploaded",
            object_type="source_document",
            object_id=str(doc_guidelines.id),
            details="Uploaded Acme Courier Brand Identity & Guidelines v2.1 (4 passages parsed)"
        ),
        AuditEvent(
            org_id=org.id,
            actor_name="Kshitija Kolkar",
            actor_role="brand_manager",
            action="rule_activated",
            object_type="rule",
            object_id="BG-CLM-004",
            details="Activated superlative claims verification rule BG-CLM-004 referencing passage P-318"
        ),
        AuditEvent(
            org_id=org.id,
            actor_name="Anushka Tambore",
            actor_role="creator",
            action="content_submitted",
            object_type="content_item",
            object_id=str(item_launch.id),
            details="Submitted draft content item 'Festival Launch Announcement' for automated brand review"
        ),
        AuditEvent(
            org_id=org.id,
            actor_name="Jayshree Gore",
            actor_role="reviewer",
            action="decision_approved",
            object_type="content_item",
            object_id=str(item_approved.id),
            details="Formally approved 'Q4 Customer Update & Green Fleet Expansion' revision 1"
        )
    ]
    db.add_all(audit_events)

    db.commit()

    return {
        "status": "success",
        "org_id": org.id,
        "message": "Acme Courier brand kit, 4 source documents, 10 rules, 4 sample content items, and audit trail seeded successfully."
    }
