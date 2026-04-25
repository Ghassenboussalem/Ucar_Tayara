from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import io
from datetime import datetime


UCAR_BLUE = HexColor('#1a3c6e')
UCAR_LIGHT = HexColor('#e8f0fa')
ALERT_RED = HexColor('#c0392b')
ALERT_ORANGE = HexColor('#e67e22')
SUCCESS_GREEN = HexColor('#27ae60')
ESG_GREEN = HexColor('#1e8449')
ESG_LIGHT = HexColor('#d5f5e3')
RESEARCH_PURPLE = HexColor('#6c3483')
RESEARCH_LIGHT = HexColor('#f0e6f6')


def generate_pdf_report(
    institution: dict,
    period: str,
    academic: dict,
    finance: dict,
    hr: dict,
    alerts: list,
    ai_summary: str,
    infrastructure: dict = None,
    partnership: dict = None,
    employment: dict = None,
    esg: dict = None,
    research: dict = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', fontSize=20, textColor=UCAR_BLUE,
                                  spaceAfter=6, fontName='Helvetica-Bold', alignment=TA_CENTER)
    subtitle_style = ParagraphStyle('Subtitle', fontSize=11, textColor=HexColor('#555555'),
                                     spaceAfter=20, alignment=TA_CENTER)
    section_style = ParagraphStyle('Section', fontSize=13, textColor=UCAR_BLUE,
                                    spaceBefore=16, spaceAfter=8, fontName='Helvetica-Bold')
    section_green_style = ParagraphStyle('SectionGreen', fontSize=13, textColor=ESG_GREEN,
                                          spaceBefore=16, spaceAfter=8, fontName='Helvetica-Bold')
    section_purple_style = ParagraphStyle('SectionPurple', fontSize=13, textColor=RESEARCH_PURPLE,
                                           spaceBefore=16, spaceAfter=8, fontName='Helvetica-Bold')
    body_style = ParagraphStyle('Body', fontSize=10, spaceAfter=6, leading=14)
    footer_style = ParagraphStyle('Footer', fontSize=8, textColor=HexColor('#999999'),
                                   alignment=TA_CENTER)

    elements = []

    # Header
    elements.append(Paragraph("UNIVERSITÉ DE CARTHAGE", title_style))
    elements.append(Paragraph(f"Rapport Institutionnel — {institution.get('name_fr', '')}", subtitle_style))
    elements.append(Paragraph(f"Période: {period} | Généré le: {datetime.now().strftime('%d/%m/%Y à %H:%M')}", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=UCAR_BLUE))
    elements.append(Spacer(1, 0.5*cm))

    # Institution info block
    info_data = [
        ['Code', institution.get('code', 'N/A'), 'Gouvernorat', institution.get('governorate', 'N/A')],
        ['Directeur', institution.get('director_name', 'N/A'), 'Période couverte', period],
    ]
    info_table = Table(info_data, colWidths=[3*cm, 6*cm, 3*cm, 5*cm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), UCAR_LIGHT),
        ('BACKGROUND', (2, 0), (2, -1), UCAR_LIGHT),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.4*cm))

    # AI Summary
    elements.append(Paragraph("Résumé Exécutif (IA)", section_style))
    elements.append(Paragraph(ai_summary.replace('\n', '<br/>'), body_style))
    elements.append(Spacer(1, 0.4*cm))

    # ── Academic KPIs ──
    elements.append(HRFlowable(width="100%", thickness=1, color=UCAR_LIGHT))
    elements.append(Paragraph("Indicateurs Académiques", section_style))
    academic_data = [
        ['Indicateur', 'Valeur', 'Statut'],
        ['Étudiants inscrits', str(academic.get('total_enrolled', 'N/A')), ''],
        ['Étudiants reçus', str(academic.get('total_passed', 'N/A')), ''],
        ['Taux de réussite', f"{academic.get('success_rate', 'N/A')}%", _status(float(academic.get('success_rate') or 0), 70, 80)],
        ['Taux d\'abandon', f"{academic.get('dropout_rate', 'N/A')}%", _status_inverse(float(academic.get('dropout_rate') or 0), 8, 15)],
        ['Taux de présence', f"{academic.get('attendance_rate', 'N/A')}%", _status(float(academic.get('attendance_rate') or 0), 75, 85)],
        ['Taux de redoublement', f"{academic.get('repetition_rate', 'N/A')}%", _status_inverse(float(academic.get('repetition_rate') or 0), 10, 18)],
        ['Note moyenne', f"{academic.get('avg_grade', 'N/A')}/20", ''],
    ]
    elements.append(_build_table(academic_data))
    elements.append(Spacer(1, 0.4*cm))

    # ── Finance KPIs ──
    elements.append(Paragraph("Indicateurs Financiers", section_style))
    finance_data = [
        ['Indicateur', 'Valeur', 'Statut'],
        ['Budget alloué', f"{float(finance.get('allocated_budget') or 0):,.0f} TND", ''],
        ['Budget consommé', f"{float(finance.get('consumed_budget') or 0):,.0f} TND", ''],
        ['Taux d\'exécution', f"{finance.get('budget_execution_rate', 'N/A')}%", _status(float(finance.get('budget_execution_rate') or 0), 60, 80)],
        ['Coût par étudiant', f"{float(finance.get('cost_per_student') or 0):,.0f} TND", ''],
        ['% Budget RH', f"{finance.get('staff_budget_pct', 'N/A')}%", ''],
        ['% Budget Infrastructure', f"{finance.get('infrastructure_budget_pct', 'N/A')}%", ''],
        ['% Budget Recherche', f"{finance.get('research_budget_pct', 'N/A')}%", ''],
    ]
    elements.append(_build_table(finance_data))
    elements.append(Spacer(1, 0.4*cm))

    # ── HR KPIs ──
    elements.append(Paragraph("Indicateurs Ressources Humaines", section_style))
    hr_data = [
        ['Indicateur', 'Valeur', 'Statut'],
        ['Personnel enseignant', str(hr.get('total_teaching_staff', 'N/A')), ''],
        ['Personnel administratif', str(hr.get('total_admin_staff', 'N/A')), ''],
        ['Taux d\'absentéisme', f"{hr.get('absenteeism_rate', 'N/A')}%", _status_inverse(float(hr.get('absenteeism_rate') or 0), 9, 15)],
        ['Charge horaire moy.', f"{hr.get('avg_teaching_load_hours', 'N/A')}h/sem", _status_inverse(float(hr.get('avg_teaching_load_hours') or 0), 22, 28)],
        ['Taux de rotation', f"{hr.get('staff_turnover_rate', 'N/A')}%", _status_inverse(float(hr.get('staff_turnover_rate') or 0), 8, 15)],
        ['Taux de formation', f"{hr.get('training_completion_rate', 'N/A')}%", _status(float(hr.get('training_completion_rate') or 0), 60, 75)],
        ['% Permanent', f"{hr.get('permanent_staff_pct', 'N/A')}%", ''],
        ['% Contractuel', f"{hr.get('contract_staff_pct', 'N/A')}%", ''],
    ]
    elements.append(_build_table(hr_data))
    elements.append(Spacer(1, 0.4*cm))

    # ── Infrastructure KPIs ──
    if infrastructure:
        elements.append(Paragraph("Indicateurs Infrastructure", section_style))
        infra_data = [
            ['Indicateur', 'Valeur', 'Statut'],
            ['Occupation des salles', f"{infrastructure.get('classroom_occupancy_rate', 'N/A')}%", _status(float(infrastructure.get('classroom_occupancy_rate') or 0), 60, 80)],
            ['Équipements IT (%)', f"{infrastructure.get('it_equipment_status_pct', 'N/A')}%", _status(float(infrastructure.get('it_equipment_status_pct') or 0), 70, 85)],
            ['Disponibilité équipements', f"{infrastructure.get('equipment_availability_rate', 'N/A')}%", _status(float(infrastructure.get('equipment_availability_rate') or 0), 75, 88)],
            ['Disponibilité labo', f"{infrastructure.get('lab_availability_rate', 'N/A')}%", _status(float(infrastructure.get('lab_availability_rate') or 0), 70, 85)],
            ['Occupation bibliothèque', f"{infrastructure.get('library_capacity_used_pct', 'N/A')}%", ''],
            ['Travaux en cours', str(infrastructure.get('ongoing_works', 'N/A')), ''],
            ['Demandes maintenance', str(infrastructure.get('maintenance_requests', 'N/A')), ''],
            ['Demandes résolues', str(infrastructure.get('resolved_requests', 'N/A')), ''],
        ]
        elements.append(_build_table(infra_data))
        elements.append(Spacer(1, 0.4*cm))

    # ── Partnership KPIs ──
    if partnership:
        elements.append(Paragraph("Indicateurs Partenariats & Mobilité", section_style))
        partner_data = [
            ['Indicateur', 'Valeur', 'Statut'],
            ['Accords nationaux actifs', str(partnership.get('active_national_agreements', 'N/A')), ''],
            ['Accords internationaux actifs', str(partnership.get('active_international_agreements', 'N/A')), ''],
            ['Étudiants entrants', str(partnership.get('incoming_students', 'N/A')), ''],
            ['Étudiants sortants', str(partnership.get('outgoing_students', 'N/A')), ''],
            ['Partenariats Erasmus+', str(partnership.get('erasmus_partnerships', 'N/A')), ''],
            ['Programmes conjoints', str(partnership.get('joint_programs', 'N/A')), ''],
            ['Partenariats industrie', str(partnership.get('industry_partnerships', 'N/A')), ''],
            ['Projets internationaux', str(partnership.get('international_projects', 'N/A')), ''],
        ]
        elements.append(_build_table(partner_data))
        elements.append(Spacer(1, 0.4*cm))

    # ── Employment KPIs ──
    if employment:
        elements.append(Paragraph("Indicateurs Employabilité des Diplômés", section_style))
        employ_data = [
            ['Indicateur', 'Valeur', 'Statut'],
            ['Total diplômés', str(employment.get('graduates_total', 'N/A')), ''],
            ['Employés à 6 mois', str(employment.get('employed_within_6months', 'N/A')), ''],
            ['Employés à 12 mois', str(employment.get('employed_within_12months', 'N/A')), ''],
            ['Taux employabilité 6m', f"{employment.get('employability_rate_6m', 'N/A')}%", _status(float(employment.get('employability_rate_6m') or 0), 35, 55)],
            ['Taux employabilité 12m', f"{employment.get('employability_rate_12m', 'N/A')}%", _status(float(employment.get('employability_rate_12m') or 0), 50, 70)],
            ['Délai moyen emploi', f"{employment.get('avg_months_to_employment', 'N/A')} mois", _status_inverse(float(employment.get('avg_months_to_employment') or 0), 8, 14)],
            ['% Emploi national', f"{employment.get('national_employment_pct', 'N/A')}%", ''],
            ['% Emploi international', f"{employment.get('international_employment_pct', 'N/A')}%", ''],
            ['% Auto-entrepreneur', f"{employment.get('self_employed_pct', 'N/A')}%", ''],
        ]
        elements.append(_build_table(employ_data))
        elements.append(Spacer(1, 0.4*cm))

    # ── ESG KPIs ──
    if esg:
        elements.append(Paragraph("Indicateurs ESG / Développement Durable", section_green_style))
        esg_data = [
            ['Indicateur', 'Valeur', 'Statut'],
            ['Consommation énergie', f"{float(esg.get('energy_consumption_kwh') or 0):,.0f} kWh", ''],
            ['Empreinte carbone', f"{esg.get('carbon_footprint_tons', 'N/A')} tonnes CO₂", _status_inverse(float(esg.get('carbon_footprint_tons') or 0), 80, 150)],
            ['Taux de recyclage', f"{esg.get('recycling_rate', 'N/A')}%", _status(float(esg.get('recycling_rate') or 0), 25, 35)],
            ['Espaces verts', f"{esg.get('green_spaces_sqm', 'N/A')} m²", ''],
            ['Mobilité durable', f"{esg.get('sustainable_mobility_pct', 'N/A')}%", _status(float(esg.get('sustainable_mobility_pct') or 0), 30, 45)],
            ['Score accessibilité', f"{esg.get('accessibility_score', 'N/A')}/100", _status(float(esg.get('accessibility_score') or 0), 55, 70)],
            ['Déchets produits', f"{esg.get('waste_produced_tons', 'N/A')} tonnes", ''],
            ['Consommation eau', f"{float(esg.get('water_consumption_m3') or 0):,.0f} m³", ''],
        ]
        elements.append(_build_table_colored(esg_data, ESG_GREEN, ESG_LIGHT))
        elements.append(Spacer(1, 0.4*cm))

    # ── Research KPIs ──
    if research:
        elements.append(Paragraph("Indicateurs Recherche Scientifique", section_purple_style))
        research_data = [
            ['Indicateur', 'Valeur', 'Statut'],
            ['Publications', str(research.get('publications_count', 'N/A')), ''],
            ['Projets actifs', str(research.get('active_projects', 'N/A')), ''],
            ['Financements obtenus', f"{float(research.get('funding_secured_tnd') or 0):,.0f} TND", ''],
            ['Doctorants inscrits', str(research.get('phd_students', 'N/A')), ''],
            ['Brevets déposés', str(research.get('patents_filed', 'N/A')), ''],
            ['Collaborations internationales', str(research.get('international_collaborations', 'N/A')), ''],
            ['Collaborations nationales', str(research.get('national_collaborations', 'N/A')), ''],
            ['Conférences', str(research.get('conferences_attended', 'N/A')), ''],
        ]
        elements.append(_build_table_colored(research_data, RESEARCH_PURPLE, RESEARCH_LIGHT))
        elements.append(Spacer(1, 0.4*cm))

    # ── Active Alerts ──
    if alerts:
        elements.append(Paragraph("Alertes Actives", section_style))
        alert_data = [['Sévérité', 'Domaine', 'Titre']]
        for alert in alerts[:5]:
            alert_data.append([
                alert.get('severity', '').upper(),
                alert.get('domain', ''),
                alert.get('title', '')[:60]
            ])
        elements.append(_build_alert_table(alert_data))
        elements.append(Spacer(1, 0.4*cm))

    # Footer
    elements.append(HRFlowable(width="100%", thickness=1, color=UCAR_BLUE))
    elements.append(Spacer(1, 0.2*cm))
    domains_covered = sum([
        bool(academic), bool(finance), bool(hr),
        bool(infrastructure), bool(partnership), bool(employment),
        bool(esg), bool(research),
    ])
    elements.append(Paragraph(
        f"Document généré automatiquement par UCAR Intelligence Platform · {domains_covered} domaines couverts · Confidentiel · Usage interne uniquement",
        footer_style
    ))

    doc.build(elements)
    return buffer.getvalue()


def generate_excel_report(
    institution: dict,
    period: str,
    academic: dict,
    finance: dict,
    hr: dict,
    infrastructure: dict = None,
    partnership: dict = None,
    employment: dict = None,
    esg: dict = None,
    research: dict = None,
) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Rapport KPIs"

    header_font = Font(bold=True, color="FFFFFF", size=12)
    header_fill = PatternFill(start_color="1a3c6e", end_color="1a3c6e", fill_type="solid")
    section_font = Font(bold=True, color="1a3c6e", size=11)
    section_fill = PatternFill(start_color="e8f0fa", end_color="e8f0fa", fill_type="solid")
    esg_font = Font(bold=True, color="1e8449", size=11)
    esg_fill = PatternFill(start_color="d5f5e3", end_color="d5f5e3", fill_type="solid")
    research_font = Font(bold=True, color="6c3483", size=11)
    research_fill = PatternFill(start_color="f0e6f6", end_color="f0e6f6", fill_type="solid")
    center = Alignment(horizontal='center', vertical='center')
    thin = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )

    # Title
    ws.merge_cells('A1:C1')
    ws['A1'] = f"UNIVERSITÉ DE CARTHAGE — {institution.get('name_fr', '')}"
    ws['A1'].font = Font(bold=True, size=14, color="1a3c6e")
    ws['A1'].alignment = center

    ws.merge_cells('A2:C2')
    ws['A2'] = f"Rapport Institutionnel · Période: {period} · Généré le {datetime.now().strftime('%d/%m/%Y')}"
    ws['A2'].alignment = center
    ws['A2'].font = Font(italic=True, size=10, color="888888")

    row = 4

    def write_section(title, data_dict, sf=section_font, sfill=section_fill):
        nonlocal row
        ws.merge_cells(f'A{row}:C{row}')
        ws[f'A{row}'] = title
        ws[f'A{row}'].font = sf
        ws[f'A{row}'].fill = sfill
        ws[f'A{row}'].alignment = center
        row += 1

        for label, value in data_dict.items():
            ws[f'A{row}'] = label
            ws[f'B{row}'] = value
            ws[f'A{row}'].font = Font(bold=True)
            ws[f'A{row}'].border = thin
            ws[f'B{row}'].border = thin
            ws[f'B{row}'].alignment = Alignment(horizontal='right')
            row += 1
        row += 1

    write_section("Indicateurs Académiques", {
        "Étudiants inscrits": academic.get('total_enrolled', 'N/A'),
        "Étudiants reçus": academic.get('total_passed', 'N/A'),
        "Taux de réussite (%)": float(academic.get('success_rate') or 0),
        "Taux d'abandon (%)": float(academic.get('dropout_rate') or 0),
        "Taux de présence (%)": float(academic.get('attendance_rate') or 0),
        "Taux de redoublement (%)": float(academic.get('repetition_rate') or 0),
        "Note moyenne (/20)": float(academic.get('avg_grade') or 0),
    })

    write_section("Indicateurs Financiers", {
        "Budget alloué (TND)": float(finance.get('allocated_budget') or 0),
        "Budget consommé (TND)": float(finance.get('consumed_budget') or 0),
        "Taux d'exécution (%)": float(finance.get('budget_execution_rate') or 0),
        "Coût par étudiant (TND)": float(finance.get('cost_per_student') or 0),
        "% Budget RH": float(finance.get('staff_budget_pct') or 0),
        "% Budget Infrastructure": float(finance.get('infrastructure_budget_pct') or 0),
        "% Budget Recherche": float(finance.get('research_budget_pct') or 0),
    })

    write_section("Indicateurs RH", {
        "Personnel enseignant": hr.get('total_teaching_staff', 'N/A'),
        "Personnel administratif": hr.get('total_admin_staff', 'N/A'),
        "Taux d'absentéisme (%)": float(hr.get('absenteeism_rate') or 0),
        "Charge horaire moy. (h/sem)": float(hr.get('avg_teaching_load_hours') or 0),
        "Taux de rotation (%)": float(hr.get('staff_turnover_rate') or 0),
        "Taux de formation (%)": float(hr.get('training_completion_rate') or 0),
        "% Personnel permanent": float(hr.get('permanent_staff_pct') or 0),
        "% Personnel contractuel": float(hr.get('contract_staff_pct') or 0),
    })

    if infrastructure:
        write_section("Indicateurs Infrastructure", {
            "Occupation des salles (%)": float(infrastructure.get('classroom_occupancy_rate') or 0),
            "Équipements IT opérationnels (%)": float(infrastructure.get('it_equipment_status_pct') or 0),
            "Disponibilité équipements (%)": float(infrastructure.get('equipment_availability_rate') or 0),
            "Disponibilité laboratoires (%)": float(infrastructure.get('lab_availability_rate') or 0),
            "Occupation bibliothèque (%)": float(infrastructure.get('library_capacity_used_pct') or 0),
            "Travaux en cours": infrastructure.get('ongoing_works', 0),
            "Demandes maintenance": infrastructure.get('maintenance_requests', 0),
            "Demandes résolues": infrastructure.get('resolved_requests', 0),
        })

    if partnership:
        write_section("Indicateurs Partenariats & Mobilité", {
            "Accords nationaux actifs": partnership.get('active_national_agreements', 0),
            "Accords internationaux actifs": partnership.get('active_international_agreements', 0),
            "Étudiants entrants": partnership.get('incoming_students', 0),
            "Étudiants sortants": partnership.get('outgoing_students', 0),
            "Partenariats Erasmus+": partnership.get('erasmus_partnerships', 0),
            "Programmes conjoints": partnership.get('joint_programs', 0),
            "Partenariats industrie": partnership.get('industry_partnerships', 0),
            "Projets internationaux": partnership.get('international_projects', 0),
        })

    if employment:
        write_section("Indicateurs Employabilité des Diplômés", {
            "Total diplômés": employment.get('graduates_total', 0),
            "Employés à 6 mois": employment.get('employed_within_6months', 0),
            "Employés à 12 mois": employment.get('employed_within_12months', 0),
            "Taux employabilité 6m (%)": float(employment.get('employability_rate_6m') or 0),
            "Taux employabilité 12m (%)": float(employment.get('employability_rate_12m') or 0),
            "Délai moyen emploi (mois)": float(employment.get('avg_months_to_employment') or 0),
            "% Emploi national": float(employment.get('national_employment_pct') or 0),
            "% Emploi international": float(employment.get('international_employment_pct') or 0),
            "% Auto-entrepreneur": float(employment.get('self_employed_pct') or 0),
        })

    if esg:
        write_section("Indicateurs ESG / Développement Durable", {
            "Consommation énergie (kWh)": float(esg.get('energy_consumption_kwh') or 0),
            "Empreinte carbone (tonnes CO2)": float(esg.get('carbon_footprint_tons') or 0),
            "Taux de recyclage (%)": float(esg.get('recycling_rate') or 0),
            "Espaces verts (m²)": esg.get('green_spaces_sqm', 0),
            "Mobilité durable (%)": float(esg.get('sustainable_mobility_pct') or 0),
            "Score accessibilité (/100)": float(esg.get('accessibility_score') or 0),
            "Déchets produits (tonnes)": float(esg.get('waste_produced_tons') or 0),
            "Consommation eau (m³)": float(esg.get('water_consumption_m3') or 0),
        }, sf=esg_font, sfill=esg_fill)

    if research:
        write_section("Indicateurs Recherche Scientifique", {
            "Publications": research.get('publications_count', 0),
            "Projets actifs": research.get('active_projects', 0),
            "Financements obtenus (TND)": float(research.get('funding_secured_tnd') or 0),
            "Doctorants inscrits": research.get('phd_students', 0),
            "Brevets déposés": research.get('patents_filed', 0),
            "Collaborations internationales": research.get('international_collaborations', 0),
            "Collaborations nationales": research.get('national_collaborations', 0),
            "Conférences": research.get('conferences_attended', 0),
        }, sf=research_font, sfill=research_fill)

    for col in ['A', 'B', 'C']:
        ws.column_dimensions[col].width = 38

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


# ─── Helpers ─────────────────────────────────────────────────

def _status(value: float, warn_threshold: float, ok_threshold: float) -> str:
    if value >= ok_threshold:
        return "✅ Normal"
    elif value >= warn_threshold:
        return "⚠️ Attention"
    else:
        return "🔴 Critique"


def _status_inverse(value: float, warn_threshold: float, critical_threshold: float) -> str:
    if value <= warn_threshold:
        return "✅ Normal"
    elif value <= critical_threshold:
        return "⚠️ Attention"
    else:
        return "🔴 Critique"


def _build_table(data: list):
    t = Table(data, colWidths=[8*cm, 4*cm, 4*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), UCAR_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, UCAR_LIGHT]),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    return t


def _build_table_colored(data: list, header_color, row_color):
    t = Table(data, colWidths=[8*cm, 4*cm, 4*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), header_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, row_color]),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    return t


def _build_alert_table(data: list):
    t = Table(data, colWidths=[3*cm, 3*cm, 10*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), UCAR_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#fff5f5'), white]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    return t
