"""Exercise the built bundle in a real browser with synthetic, read-only API fixtures.

Not a live API, security certification or visual approval. Runs only against loopback.
"""
import json
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

DIST = Path(__file__).resolve().parents[2] / "dist"
EMPTY_PAGE = {"items": [], "page": 0, "size": 20, "total": 0, "unseen": 0}
CLINIC = {"id": "synthetic-clinic", "name": "Clinique de test"}
START = datetime.now(timezone.utc) + timedelta(days=2)
APPOINTMENT = {
    "id": "synthetic-appointment", "status": "BOOKED", "clinic": CLINIC,
    "startsAt": START.isoformat(), "endsAt": (START + timedelta(minutes=30)).isoformat(),
    "practitioner": {"id": "synthetic-doctor", "firstName": "Médecin", "lastName": "Synthétique"},
}
PATIENT = {
    "id": "synthetic-patient", "email": "patient@example.invalid", "firstName": "Patient",
    "lastName": "Synthétique", "roles": ["PATIENT"], "role": "PATIENT", "enabled": True, "emailVerified": True,
}


class StaticApp(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self):
        if not Path(self.translate_path(self.path)).is_file():
            self.path = "/index.html"
        super().do_GET()

    def log_message(self, *_args):
        pass


def install_fixtures(context, origin, role):
    def respond(route):
        path = urlsplit(route.request.url).path.removeprefix("/api")
        if route.request.method != "GET":
            route.fulfill(status=405, json={"code": "METHOD_NOT_ALLOWED", "message": "Test en lecture seule"})
            return
        if path == "/auth/me":
            if role is None:
                route.fulfill(status=401, json={"code": "UNAUTHENTICATED", "message": "Non connecté"})
                return
            data = {"user": {"id": "synthetic-user", "email": "test@example.invalid",
                             "firstName": "Test", "lastName": "Synthétique", "roles": [role]}}
        elif path == "/auth/consent":
            data = {"version": "synthetic", "text": "Consentement synthétique pour les tests.", "required": True}
        elif path in ("/slots/filters", "/admin/slots/filters"):
            data = {"specialties": [], "clinics": [], "practitioners": []}
        elif path == "/practitioner/agenda":
            data = {"clinics": [CLINIC], "items": []}
        elif path in ("/practitioner/alerts", "/practitioner/absences", "/admin/practitioners"):
            data = []
        elif path == "/admin/audit-entries":
            data = {"items": [], "page": 0, "size": 20, "totalElements": 0, "totalPages": 0}
        elif path == "/appointments/me":
            data = {**EMPTY_PAGE, "items": [APPOINTMENT], "total": 1}
        elif path == "/admin/users":
            data = {**EMPTY_PAGE, "items": [PATIENT], "total": 1}
        elif path == "/reports/me":
            data = []
        elif path in ("/slots", "/results/me", "/patients/me/reassignments",
                       "/patients/synthetic-user/documents", "/patients/synthetic-patient/documents"):
            data = EMPTY_PAGE
        else:
            route.fulfill(status=404, json={"code": "NOT_FOUND", "message": "Fixture non définie"})
            return
        route.fulfill(status=200, json=data)

    def local_only(route):
        if route.request.url.startswith(origin + "/"):
            route.continue_()
        else:
            route.abort()

    context.route("**/*", local_only)
    context.route(origin + "/api/**", respond)


def assert_layout(page):
    assert page.locator("main").count() == 1, "Expected exactly one main region"
    assert page.locator("h1").count() == 1, "Expected exactly one page heading"
    width = page.evaluate("document.documentElement.scrollWidth - innerWidth")
    assert width <= 2, f"Page-level horizontal overflow: {width}px at {page.url}"


def exercise_public(page, origin):
    page.goto(origin + "/")
    expect(page.get_by_role("heading", level=1)).to_contain_text("Vos soins commencent")
    assert_layout(page)
    faq = page.get_by_role("button", name="Ai-je besoin d’un compte pour réserver ?")
    faq.focus()
    page.keyboard.press("Enter")
    expect(faq).to_have_attribute("aria-expanded", "true")
    page.keyboard.press("Space")
    expect(faq).to_have_attribute("aria-expanded", "false")
    page.get_by_role("link", name="Prendre rendez-vous").click()
    expect(page).to_have_url(origin + "/connexion")
    expect(page.get_by_role("heading", level=1, name="Bienvenue sur MedLink", exact=True)).to_be_visible()
    assert_layout(page)


def open_more(page):
    mobile_nav = page.get_by_role("navigation", name="Navigation mobile")
    more = mobile_nav.get_by_role("button", name="Plus", exact=True)
    expect(more).to_have_attribute("aria-expanded", "false")
    more.click()
    expect(more).to_have_attribute("aria-expanded", "true")
    menu = page.get_by_role("navigation", name="Menu de l’espace")
    expect(menu).to_be_visible()
    return more, menu


def exercise_space(page, origin, role, mobile):
    root, title = {
        "PATIENT": ("/patient", "Espace patient"),
        "PRACTITIONER": ("/praticien", "Espace praticien"),
        "ADMINISTRATIVE_STAFF": ("/admin", "Espace administratif"),
    }[role]
    page.goto(origin + root)
    expect(page.get_by_role("heading", level=1, name=title)).to_be_visible()
    expect(page.get_by_role("heading", name="Bonjour, Test" if role == "PATIENT" else "Bonjour Test")).to_be_visible()
    assert_layout(page)
    mobile_nav = page.get_by_role("navigation", name="Navigation mobile")
    menu = page.get_by_role("navigation", name="Menu de l’espace")
    expect(mobile_nav if mobile else menu).to_be_visible()
    expect(menu if mobile else mobile_nav).not_to_be_visible()

    if role == "PATIENT":
        visit = page.get_by_role("region", name="Prochain rendez-vous")
        expect(visit.get_by_text("Dr Médecin Synthétique")).to_be_visible()
        visit.get_by_role("button", name="Annuler", exact=True).click()
        dialog = page.get_by_role("dialog", name="Annuler ce rendez-vous ?")
        expect(dialog).to_be_visible()
        dialog.get_by_role("button", name="Garder mon rendez-vous").click()
        expect(dialog).not_to_be_visible()

        if mobile:
            expect(mobile_nav.get_by_role("link")).to_have_count(4)
            dossier = mobile_nav.get_by_role("link", name="Mon dossier", exact=True)
            dossier.click()
        else:
            page.get_by_role("main").get_by_role("link", name="Mon dossier médical", exact=False).click()
        expect(page.get_by_text("Aucun résultat publié.")).to_be_visible()
        sections = page.get_by_role("navigation", name="Dossier médical", exact=True)
        sections.get_by_role("link", name="Comptes-rendus du dossier").click()
        expect(page.get_by_text("Aucun compte-rendu pour l’instant")).to_be_visible()
        if mobile:
            expect(dossier).to_have_attribute("aria-current", "page")
        assert_layout(page)

        appointments_label = "Mes rendez-vous" if mobile else "Rendez-vous"
        (mobile_nav if mobile else menu).get_by_role("link", name=appointments_label, exact=True).click()
        expect(page.get_by_role("heading", name="Mes rendez-vous", exact=True)).to_be_visible()
        sections = page.get_by_role("navigation", name="Gestion des rendez-vous")
        sections.get_by_role("link", name="Propositions de transfert").click()
        expect(page.get_by_text("Aucune proposition.")).to_be_visible()
        if mobile:
            expect(mobile_nav.get_by_role("link", name="Mes rendez-vous")).to_have_attribute("aria-current", "page")
    else:
        label = "Absences" if role == "PRACTITIONER" else "Documents patients"
        if mobile:
            expect(mobile_nav.get_by_role("link")).to_have_count(3)
            more, menu = open_more(page)
            item = menu.get_by_role("link", name=label, exact=True)
            first = menu.get_by_role("link").first
            more.press("Tab")
            expect(first).to_be_focused()
            first.press("Escape")
            expect(more).to_have_attribute("aria-expanded", "false")
            expect(more).to_be_focused()
            expect(menu).not_to_be_visible()
            open_more(page)
        item = menu.get_by_role("link", name=label, exact=True)
        item.click()
        title = "Mes absences" if role == "PRACTITIONER" else "Documents patients"
        expect(page.get_by_role("heading", name=title, exact=True)).to_be_visible()
        if mobile:
            expect(more).to_have_attribute("aria-expanded", "false")
            expect(menu).not_to_be_visible()
        else:
            expect(item).to_have_attribute("aria-current", "page")

        if role == "ADMINISTRATIVE_STAFF":
            expect(page.get_by_role("heading", name="Aucun patient sélectionné")).to_be_visible()
            with page.expect_request(lambda request: urlsplit(request.url).path.endswith("/synthetic-patient/documents")):
                page.get_by_label("Patient", exact=True).select_option("synthetic-patient")
            expect(page.get_by_role("heading", name="Aucun document", exact=True)).to_be_visible()
    assert_layout(page)


def main():
    assert (DIST / "index.html").is_file(), "Run npm run build first"
    server = ThreadingHTTPServer(("127.0.0.1", 0), StaticApp)
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"
    roles = [None, "PATIENT", "PRACTITIONER", "ADMINISTRATIVE_STAFF"]
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            for width in (1440, 390):
                for role in roles:
                    context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
                    install_fixtures(context, origin, role)
                    page = context.new_page()
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    try:
                        if role is None:
                            exercise_public(page, origin)
                        else:
                            exercise_space(page, origin, role, mobile=width <= 760)
                        assert not errors, json.dumps(errors, ensure_ascii=False)
                        print(f"PASS {role or 'PUBLIC'} {width}px")
                    finally:
                        context.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
