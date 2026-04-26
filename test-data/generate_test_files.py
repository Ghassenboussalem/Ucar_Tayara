"""
Generate test PDF and PNG files for UCAR ETL ingestion testing.
Run: python generate_test_files.py
Output: SUPCOM_finance_S1_2025.pdf  and  IHEC_hr_S1_2025_source.pdf
"""
from fpdf import FPDF
import os

OUT = os.path.dirname(os.path.abspath(__file__))

BLUE  = (29, 83, 148)
RED   = (220, 38, 38)
AMBER = (217, 119, 6)
GRAY  = (100, 116, 139)
LIGHT = (241, 245, 249)

def hrow(pdf, cols, widths, bg=BLUE, fg=(255,255,255)):
    pdf.set_fill_color(*bg)
    pdf.set_text_color(*fg)
    pdf.set_font("Helvetica", "B", 8)
    for col, w in zip(cols, widths):
        pdf.cell(w, 7, col, border=1, fill=True, align="C")
    pdf.ln()
    pdf.set_text_color(0,0,0)

def drow(pdf, values, widths, aligns, shade=False, alert=False):
    pdf.set_font("Helvetica", "", 7)
    pdf.set_fill_color(*(LIGHT if shade else (255,255,255)))
    pdf.set_text_color(*(RED if alert else (0,0,0)))
    for val, w, a in zip(values, widths, aligns):
        pdf.cell(w, 6, str(val), border=1, fill=True, align=a)
    pdf.ln()
    pdf.set_text_color(0,0,0)

def stitle(pdf, text, color=BLUE):
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*color)
    pdf.set_xy(pdf.get_x(), pdf.get_y() + 2)
    pdf.cell(0, 7, text, ln=True)
    pdf.set_draw_color(*color)
    pdf.set_line_width(0.5)
    pdf.line(12, pdf.get_y(), 198, pdf.get_y())
    pdf.ln(4)
    pdf.set_text_color(0,0,0)
    pdf.set_draw_color(0,0,0)
    pdf.set_line_width(0.2)

def kpi_boxes(pdf, items, box_w=44):
    for label, val, color in items:
        pdf.set_fill_color(*color)
        x, y = pdf.get_x(), pdf.get_y()
        pdf.rect(x, y, box_w, 18, "F")
        pdf.set_text_color(255,255,255)
        pdf.set_font("Helvetica","",7)
        pdf.set_xy(x+2, y+2); pdf.cell(box_w-4, 5, label)
        pdf.set_font("Helvetica","B",12)
        pdf.set_xy(x+2, y+8); pdf.cell(box_w-4, 7, val)
        pdf.set_xy(x+box_w+2, y)
    pdf.ln(22)
    pdf.set_text_color(0,0,0)


# ─────────────────────────────────────────────────────────────────────────────
# PDF 1 : SUPCOM Finance Budget (triggers budget_execution_rate > 100% alert)
# ─────────────────────────────────────────────────────────────────────────────

class FinPDF(FPDF):
    def header(self):
        self.set_fill_color(*BLUE)
        self.rect(0, 0, 210, 28, "F")
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(255,255,255)
        self.set_xy(10, 5)
        self.cell(0, 7, "SUPCOM - Ecole Superieure des Communications de Tunis", ln=True)
        self.set_font("Helvetica", "", 9)
        self.set_xy(10, 13)
        self.cell(0, 6, "Rapport Financier - Budget Exploitation S1 2025 | document_type: finance", ln=True)
        self.set_text_color(0,0,0)
        self.ln(6)
    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica","I",7)
        self.set_text_color(*GRAY)
        self.cell(0, 8, f"Page {self.page_no()} - UCAR ETL Test Document - Confidentiel", align="C")

pdf = FinPDF()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_page()
pdf.set_margins(12, 32, 12)

pdf.set_font("Helvetica","B",9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, "INDICATEURS CLES - EXERCICE S1 2025", ln=True)
pdf.ln(2)

kpi_boxes(pdf, [
    ("Budget Total Alloue",  "2 847 000 TND", BLUE),
    ("Budget Consomme",      "3 421 400 TND", RED),
    ("Taux d Execution",     "120.2 %",       RED),
    ("Depassement",          "574 400 TND",   RED),
])

stitle(pdf, "Detail par ligne budgetaire")
cols   = ["Ligne budgetaire",        "Dept.",         "Alloue (TND)", "Consomme (TND)", "Taux %", "Statut"]
widths = [52, 30, 26, 27, 20, 18]
aligns = ["L","L","R","R","R","C"]
hrow(pdf, cols, widths)

rows = [
    ("Salaires enseignants",       "Info",     950000, 1085000, "114.2", "DEPASSE"),
    ("Salaires enseignants",       "Telecom",  780000,  912000, "116.9", "DEPASSE"),
    ("Salaires administratifs",    "Admin",    280000,  298000, "106.4", "DEPASSE"),
    ("Equipements informatiques",  "Info",     220000,  387000, "175.9", "DEPASSE"),
    ("Maintenance reseaux",        "Infra",    145000,  198000, "136.6", "DEPASSE"),
    ("Licences logiciels",         "Info",      95000,  154000, "162.1", "DEPASSE"),
    ("Eau et electricite",         "Infra",     72000,   89000, "123.6", "DEPASSE"),
    ("Formation personnel",        "RH",        48000,   52000, "108.3", "DEPASSE"),
    ("Documentation abonnements",  "Biblio",    38000,   41000, "107.9", "DEPASSE"),
    ("Activites etudiantes",       "Etudiant",  32000,   28500,  "89.1", "OK"),
    ("Missions / Deplacement",     "Recherche", 85000,   76000,  "89.4", "OK"),
    ("Communication externe",      "Marketing", 22000,     900,   "4.1", "OK"),
    ("Reserve imprevu",            "Direction", 80000,       0,   "0.0", "OK"),
]

for i, row in enumerate(rows):
    drow(pdf, row, widths, aligns, shade=(i%2==0), alert=(row[-1]=="DEPASSE"))

pdf.ln(5)
stitle(pdf, "Analyse des depassements budgetaires")
pdf.set_font("Helvetica","",8)
pdf.set_text_color(*GRAY)
pdf.multi_cell(0, 5,
    "L exercice S1 2025 enregistre un depassement global de 574 400 TND soit +20.2% au-dessus "
    "du budget alloue. Les postes critiques : equipements informatiques (+75.9%) suite au "
    "renouvellement non planifie des serveurs HPC, licences logiciels (+62.1%), maintenance "
    "reseaux (+36.6%). Les salaires depassent de 14-17% en raison des primes de performance. "
    "Une revision budgetaire d urgence est requise avant le 31 juillet 2025."
)
pdf.ln(4)

stitle(pdf, "Recommandations correctives", color=AMBER)
rc = ["Action corrective",                  "Responsable",  "Echeance",   "Impact (TND)"]
rw = [78, 36, 26, 33]
ra = ["L","L","C","R"]
hrow(pdf, rc, rw, bg=AMBER)
for i, row in enumerate([
    ("Gel achats equipements non essentiels", "DAF + DSI",   "Aout 2025",  "-120 000"),
    ("Renegociation contrats licences",       "DSI",         "Sept. 2025", "-45 000"),
    ("Audit consommation energetique",        "Infra",       "Juil. 2025", "-15 000"),
    ("Report formation vers S1-2026",         "DRH",         "Juil. 2025", "-12 000"),
]):
    drow(pdf, row, rw, ra, shade=(i%2==0))

pdf.ln(5)
pdf.set_font("Helvetica","I",7)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5,
    "institution: SUPCOM | period: S1_2025 | document_type: finance | allocated_tnd: 2847000 | consumed_tnd: 3421400",
    ln=True)

out1 = os.path.join(OUT, "SUPCOM_finance_S1_2025.pdf")
pdf.output(out1)
print(f"[OK] PDF 1 saved: {out1}")


# ─────────────────────────────────────────────────────────────────────────────
# PDF 2 : IHEC HR Report (triggers absenteeism > 20% alert) — also saved as
#          source for the screenshot-to-PNG test
# ─────────────────────────────────────────────────────────────────────────────

class HrPDF(FPDF):
    def header(self):
        self.set_fill_color(*BLUE)
        self.rect(0, 0, 210, 28, "F")
        self.set_font("Helvetica","B",13)
        self.set_text_color(255,255,255)
        self.set_xy(10,5)
        self.cell(0, 7, "IHEC Carthage - Institut des Hautes Etudes Commerciales", ln=True)
        self.set_font("Helvetica","",9)
        self.set_xy(10,13)
        self.cell(0, 6, "Rapport RH - Effectifs & Absenteisme S1 2025 | document_type: hr", ln=True)
        self.set_text_color(0,0,0)
        self.ln(6)
    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica","I",7)
        self.set_text_color(*GRAY)
        self.cell(0,8,f"Page {self.page_no()} - UCAR ETL Test Document - Confidentiel", align="C")

hr = HrPDF()
hr.set_auto_page_break(auto=True, margin=20)
hr.add_page()
hr.set_margins(12, 32, 12)

hr.set_font("Helvetica","B",9)
hr.set_text_color(*GRAY)
hr.cell(0, 5, "TABLEAU DE BORD RH - S1 2025", ln=True)
hr.ln(2)

kpi_boxes(hr, [
    ("Effectif total",    "142 pers.", BLUE),
    ("Taux absenteisme",  "26.4 %",   RED),
    ("Jours perdus S1",   "2 847 j.", RED),
    ("Turn-over",         "11.3 %",   AMBER),
])

stitle(hr, "Effectifs par departement et type de personnel")
hc = ["Departement",           "Type",          "Effectif", "J. travail", "J. absents", "Abs. %", "Demiss."]
hw = [46, 28, 16, 18, 18, 18, 16]
ha = ["L","L","C","C","C","R","C"]
hrow(hr, hc, hw)

hr_rows = [
    ("Finance & Comptabilite",  "Enseignant",     22, 115, 38, "33.9", 2),
    ("Finance & Comptabilite",  "Administratif",   8, 115, 24, "26.1", 0),
    ("Management & Strategie",  "Enseignant",     28, 115, 41, "36.6", 3),
    ("Droit des Affaires",      "Enseignant",     18, 115, 29, "25.2", 1),
    ("Informatique de Gestion", "Enseignant",     16, 115, 35, "31.3", 2),
    ("Marketing",               "Enseignant",     12, 115, 22, "19.1", 0),
    ("Economie",                "Enseignant",     14, 115, 32, "28.6", 1),
    ("Administration Scolarite","Administratif",  12, 115, 28, "24.3", 0),
    ("Services Generaux",       "Technique",       8, 115, 19, "20.7", 1),
    ("Bibliotheque & Doc",      "Administratif",   4, 115, 15, "32.6", 0),
]
for i, row in enumerate(hr_rows):
    drow(hr, row, hw, ha, shade=(i%2==0), alert=(float(row[5])>20))

hr.ln(5)
stitle(hr, "Analyse et observations")
hr.set_font("Helvetica","",8)
hr.set_text_color(*GRAY)
hr.multi_cell(0, 5,
    "Le taux d absenteisme global de 26.4% depasse le seuil d alerte fixe a 20%. "
    "Management & Strategie enregistre le taux le plus critique (36.6%), suivi de "
    "Finance & Comptabilite (33.9%). Le turn-over de 11.3% est en hausse de 3.2 points "
    "vs S1-2024. Enquete de climat social recommandee en urgence. "
    "Les departements enseignants sont les plus touches. Actions RH prioritaires : "
    "entretiens individuels, revision charge cours, programme bien-etre."
)
hr.ln(4)

# Data rows for ETL extraction (machine-readable section at the bottom)
stitle(hr, "Donnees brutes pour extraction automatique (ETL)")
hr.set_font("Helvetica","",7)
hr.set_text_color(*GRAY)
hr.cell(0, 4, "employee_id | department | staff_type | headcount | working_days | absent_days | resigned | hired", ln=True)
hr.set_text_color(0,0,0)
raw = [
    ("EMP-G01","Finance & Comptabilite","enseignant",22,115,38,2,0),
    ("EMP-G02","Finance & Comptabilite","administratif",8,115,24,0,0),
    ("EMP-G03","Management & Strategie","enseignant",28,115,41,3,1),
    ("EMP-G04","Droit des Affaires","enseignant",18,115,29,1,0),
    ("EMP-G05","Informatique de Gestion","enseignant",16,115,35,2,1),
    ("EMP-G06","Marketing","enseignant",12,115,22,0,0),
    ("EMP-G07","Economie","enseignant",14,115,32,1,0),
    ("EMP-G08","Administration Scolarite","administratif",12,115,28,0,0),
    ("EMP-G09","Services Generaux","technique",8,115,19,1,0),
    ("EMP-G10","Bibliotheque & Doc","administratif",4,115,15,0,0),
]
hr.set_font("Helvetica","",6.5)
for row in raw:
    hr.cell(0, 4, " | ".join(str(v) for v in row), ln=True)

hr.ln(4)
hr.set_font("Helvetica","I",7)
hr.set_text_color(*GRAY)
hr.cell(0, 5,
    "institution: IHEC | period: S1_2025 | document_type: hr | generated: 2025-06-30",
    ln=True)

out2 = os.path.join(OUT, "IHEC_hr_S1_2025_source.pdf")
hr.output(out2)
print(f"[OK] PDF 2 saved: {out2}")

# Try auto-convert page 1 to PNG
try:
    from pdf2image import convert_from_path
    imgs = convert_from_path(out2, dpi=150, first_page=1, last_page=1)
    out_png = os.path.join(OUT, "IHEC_hr_S1_2025.png")
    imgs[0].save(out_png, "PNG")
    print(f"[OK] PNG saved: {out_png}")
except Exception:
    print("[INFO] Open IHEC_hr_S1_2025_source.pdf and screenshot page 1 -> save as IHEC_hr_S1_2025.png")

print(f"\nAll done. Files in: {OUT}")
print("\nUpload SUPCOM_finance_S1_2025.pdf -> institution SUPCOM -> triggers budget alert")
print("Upload IHEC_hr_S1_2025.png        -> institution IHEC  -> triggers absenteeism alert")
