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


def generate_pdf_report(
    institution: dict,
    period: str,
    academic: dict,
    finance: dict,
    hr: dict,
    alerts: list,
    ai_summary: str
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

    # AI Summary
    elements.append(Paragraph("Résumé Exécutif (IA)", section_style))
    elements.append(Paragraph(ai_summary.replace('\n', '<br/>'), body_style))
    elements.append(Spacer(1, 0.4*cm))

    # Academic KPIs
    elements.append(HRFlowable(width="100%", thickness=1, color=UCAR_LIGHT))
    elements.append(Paragraph("📊 Indicateurs Académiques", section_style))
    academic_data = [
        ['Indicateur', 'Valeur', 'Statut'],
        ['Étudiants inscrits', str(academic.get('total_enrolled', 'N/A')), ''],
        ['Taux de réussite', f"{academic.get('success_rate', 'N/A')}%", _status(float(academic.get('success_rate', 0)), 70, 80)],
        ['Taux d\'abandon', f"{academic.get('dropout_rate', 'N/A')}%", _status_inverse(float(academic.get('dropout_rate', 0)), 8, 15)],
        ['Taux de présence', f"{academic.get('attendance_rate', 'N/A')}%", _status(float(academic.get('attendance_rate', 0)), 75, 85)],
        ['Note moyenne', f"{academic.get('avg_grade', 'N/A')}/20", ''],
    ]
    elements.append(_build_table(academic_data))
    elements.append(Spacer(1, 0.4*cm))

    # Finance KPIs
    elements.append(Paragraph("💰 Indicateurs Financiers", section_style))
    finance_data = [
        ['Indicateur', 'Valeur', 'Statut'],
        ['Budget alloué', f"{float(finance.get('allocated_budget', 0)):,.0f} TND", ''],
        ['Budget consommé', f"{float(finance.get('consumed_budget', 0)):,.0f} TND", ''],
        ['Taux d\'exécution', f"{finance.get('budget_execution_rate', 'N/A')}%", _status(float(finance.get('budget_execution_rate', 0)), 60, 80)],
        ['Coût par étudiant', f"{float(finance.get('cost_per_student', 0)):,.0f} TND", ''],
    ]
    elements.append(_build_table(finance_data))
    elements.append(Spacer(1, 0.4*cm))

    # HR KPIs
    elements.append(Paragraph("👥 Indicateurs Ressources Humaines", section_style))
    hr_data = [
        ['Indicateur', 'Valeur', 'Statut'],
        ['Personnel enseignant', str(hr.get('total_teaching_staff', 'N/A')), ''],
        ['Personnel administratif', str(hr.get('total_admin_staff', 'N/A')), ''],
        ['Taux d\'absentéisme', f"{hr.get('absenteeism_rate', 'N/A')}%", _status_inverse(float(hr.get('absenteeism_rate', 0)), 9, 15)],
        ['Charge horaire moy.', f"{hr.get('avg_teaching_load_hours', 'N/A')}h/sem", _status_inverse(float(hr.get('avg_teaching_load_hours', 0)), 22, 28)],
        ['Taux de formation', f"{hr.get('training_completion_rate', 'N/A')}%", _status(float(hr.get('training_completion_rate', 0)), 60, 75)],
    ]
    elements.append(_build_table(hr_data))
    elements.append(Spacer(1, 0.4*cm))

    # Active Alerts
    if alerts:
        elements.append(Paragraph("🚨 Alertes Actives", section_style))
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
    elements.append(Paragraph(
        "Document généré automatiquement par UCAR Intelligence Platform · Confidentiel · Usage interne uniquement",
        footer_style
    ))

    doc.build(elements)
    return buffer.getvalue()


def generate_excel_report(
    institution: dict,
    period: str,
    academic: dict,
    finance: dict,
    hr: dict
) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Rapport KPIs"

    header_font = Font(bold=True, color="FFFFFF", size=12)
    header_fill = PatternFill(start_color="1a3c6e", end_color="1a3c6e", fill_type="solid")
    section_font = Font(bold=True, color="1a3c6e", size=11)
    section_fill = PatternFill(start_color="e8f0fa", end_color="e8f0fa", fill_type="solid")
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

    def write_section(title, data_dict):
        nonlocal row
        ws.merge_cells(f'A{row}:C{row}')
        ws[f'A{row}'] = title
        ws[f'A{row}'].font = section_font
        ws[f'A{row}'].fill = section_fill
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

    write_section("📊 Indicateurs Académiques", {
        "Étudiants inscrits": academic.get('total_enrolled', 'N/A'),
        "Étudiants reçus": academic.get('total_passed', 'N/A'),
        "Taux de réussite (%)": float(academic.get('success_rate', 0)),
        "Taux d'abandon (%)": float(academic.get('dropout_rate', 0)),
        "Taux de présence (%)": float(academic.get('attendance_rate', 0)),
        "Note moyenne (/20)": float(academic.get('avg_grade', 0)),
    })

    write_section("💰 Indicateurs Financiers", {
        "Budget alloué (TND)": float(finance.get('allocated_budget', 0)),
        "Budget consommé (TND)": float(finance.get('consumed_budget', 0)),
        "Taux d'exécution (%)": float(finance.get('budget_execution_rate', 0)),
        "Coût par étudiant (TND)": float(finance.get('cost_per_student', 0)),
        "% Budget RH": float(finance.get('staff_budget_pct', 0)),
        "% Budget Infrastructure": float(finance.get('infrastructure_budget_pct', 0)),
        "% Budget Recherche": float(finance.get('research_budget_pct', 0)),
    })

    write_section("👥 Indicateurs RH", {
        "Personnel enseignant": hr.get('total_teaching_staff', 'N/A'),
        "Personnel administratif": hr.get('total_admin_staff', 'N/A'),
        "Taux d'absentéisme (%)": float(hr.get('absenteeism_rate', 0)),
        "Charge horaire moy. (h/sem)": float(hr.get('avg_teaching_load_hours', 0)),
        "Taux de rotation (%)": float(hr.get('staff_turnover_rate', 0)),
        "Taux de formation (%)": float(hr.get('training_completion_rate', 0)),
    })

    for col in ['A', 'B', 'C']:
        ws.column_dimensions[col].width = 35

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
    from reportlab.lib.colors import HexColor
    t = Table(data, colWidths=[8*cm, 4*cm, 4*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), UCAR_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('BACKGROUND', (0, 1), (-1, -1), UCAR_LIGHT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, UCAR_LIGHT]),
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