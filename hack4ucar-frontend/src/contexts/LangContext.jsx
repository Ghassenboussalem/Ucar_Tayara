import { createContext, useContext, useState, useEffect } from 'react'

const T = {
  fr: {
    // Sidebar nav sections
    'nav.overview': "Vue d'ensemble",
    'nav.data': 'Données',
    'nav.intelligence': 'Intelligence',
    'nav.coming': 'Modules à venir',
    // Sidebar nav items
    'nav.dashboard': 'Tableau de bord',
    'nav.institutions': 'Institutions',
    'nav.alerts': 'Alertes',
    'nav.ingestion': 'Ingestion ETL',
    'nav.reports': 'Rapports',
    'nav.analytics': 'Analytique prédictive',
    // Sidebar coming soon modules
    'mod.research': 'Recherche',
    'mod.partnerships': 'Partenariats',
    'mod.student': 'Vie Étudiante',
    'mod.infra': 'Infrastructure',
    'mod.equipment': 'Équipements',
    'mod.inventory': 'Inventaire',
    'mod.training': 'Formation Continue',
    'mod.esg': 'ESG / RSE',
    'mod.strategy': 'Stratégie',
    'mod.logistics': 'Logistique',
    'mod.pedagogy': 'Pédagogie',
    'mod.scolarite': 'Scolarité',
    // Sidebar misc
    'sidebar.ai': 'Moteur IA actif',
    'sidebar.ai.sub': 'Claude Sonnet · Prédictif',
    'sidebar.logout': 'Déconnexion',
    // Roles
    'role.presidency': 'Présidence UCAR',
    'role.institution_admin': 'Admin Institution',
    'role.viewer': 'Observateur',
    'role.unknown': 'Inconnu',
    // TopBar
    'topbar.morning': 'Bonjour',
    'topbar.afternoon': 'Bon après-midi',
    'topbar.evening': 'Bonsoir',
    'topbar.search': 'Rechercher une institution, un KPI…',
    'topbar.ai_btn': "Demander à l'IA",
    'topbar.all_inst': 'Tous les établissements',
    'topbar.search_inst': 'Rechercher…',
    'topbar.lang_switch_title': 'Basculer la langue',
    // Alert domains & severity
    'domain.academic': 'Académique',
    'domain.finance': 'Finance',
    'domain.hr': 'RH',
    'domain.esg': 'ESG',
    'domain.research': 'Recherche',
    'domain.employment': 'Emploi',
    'domain.infrastructure': 'Infrastructure',
    'domain.partnership': 'Partenariats',
    'domain.general': 'Général',
    'sev.critical': '🔴 Critique',
    'sev.warning': '🟠 Attention',
    'sev.info': '🔵 Info',
    'alert.view_alerts': 'Voir les alertes',
    'alert.close': 'Fermer',
    // DataIngestionPage
    'etl.title': 'Ingestion ETL',
    'etl.subtitle': "Importez des fichiers PDF, images ou CSV pour extraction automatique et alimentation des indicateurs.",
    'etl.drop': 'Glissez-déposez vos fichiers ici ou cliquez pour sélectionner',
    'etl.drop_sub': 'PDF, PNG, JPG, CSV — plusieurs fichiers acceptés',
    'etl.pending_title': 'Fichiers en attente',
    'etl.launch': "Lancer l'import",
    'etl.type': 'Type',
    'etl.remove': 'Retirer',
    'etl.pipeline_title': "Pipeline d'ingestion",
    'etl.batch_label': 'fichiers',
    'etl.step.upload': 'Envoi du fichier',
    'etl.step.queue': "File d'attente",
    'etl.step.ocr': 'Extraction OCR',
    'etl.step.validate': 'Validation données',
    'etl.step.store': 'Stockage base',
    'etl.step.push': 'Envoi plateforme',
    'etl.live': 'Flux en direct',
    'etl.result.title': "Résultats d'extraction",
    'etl.result.quality': 'Qualité',
    'etl.result.records': 'enregistrements',
    'etl.result.anomalies': 'anomalies',
    'etl.result.kpis': 'KPIs calculés',
    'etl.result.alert': 'Alerte déclenchée',
    'etl.result.domain': 'Domaine',
    'etl.result.preview': 'Aperçu données extraites',
    'etl.error': 'Erreur de traitement',
    // Language switcher
    'lang.toggle': 'عربي',
  },
  ar: {
    // Sidebar nav sections
    'nav.overview': 'نظرة عامة',
    'nav.data': 'البيانات',
    'nav.intelligence': 'الذكاء',
    'nav.coming': 'وحدات قادمة',
    // Sidebar nav items
    'nav.dashboard': 'لوحة التحكم',
    'nav.institutions': 'المؤسسات',
    'nav.alerts': 'التنبيهات',
    'nav.ingestion': 'استيراد ETL',
    'nav.reports': 'التقارير',
    'nav.analytics': 'التحليل التنبؤي',
    // Sidebar coming soon modules
    'mod.research': 'البحث العلمي',
    'mod.partnerships': 'الشراكات',
    'mod.student': 'الحياة الطلابية',
    'mod.infra': 'البنية التحتية',
    'mod.equipment': 'المعدات',
    'mod.inventory': 'المخزون',
    'mod.training': 'التكوين المستمر',
    'mod.esg': 'ESG / RSE',
    'mod.strategy': 'الاستراتيجية',
    'mod.logistics': 'اللوجستيات',
    'mod.pedagogy': 'البيداغوجيا',
    'mod.scolarite': 'الشؤون الطلابية',
    // Sidebar misc
    'sidebar.ai': 'محرك الذكاء الاصطناعي',
    'sidebar.ai.sub': 'Claude Sonnet · تنبؤي',
    'sidebar.logout': 'تسجيل الخروج',
    // Roles
    'role.presidency': 'رئاسة UCAR',
    'role.institution_admin': 'مدير المؤسسة',
    'role.viewer': 'مراقب',
    'role.unknown': 'غير معروف',
    // TopBar
    'topbar.morning': 'صباح الخير',
    'topbar.afternoon': 'مساء الخير',
    'topbar.evening': 'مساء الخير',
    'topbar.search': 'البحث عن مؤسسة أو مؤشر…',
    'topbar.ai_btn': 'اسأل الذكاء الاصطناعي',
    'topbar.all_inst': 'جميع المؤسسات',
    'topbar.search_inst': 'بحث…',
    'topbar.lang_switch_title': 'تغيير اللغة',
    // Alert domains & severity
    'domain.academic': 'أكاديمي',
    'domain.finance': 'مالي',
    'domain.hr': 'الموارد البشرية',
    'domain.esg': 'ESG',
    'domain.research': 'بحث',
    'domain.employment': 'توظيف',
    'domain.infrastructure': 'بنية تحتية',
    'domain.partnership': 'شراكات',
    'domain.general': 'عام',
    'sev.critical': '🔴 حرج',
    'sev.warning': '🟠 تحذير',
    'sev.info': '🔵 معلومة',
    'alert.view_alerts': 'عرض التنبيهات',
    'alert.close': 'إغلاق',
    // DataIngestionPage
    'etl.title': 'استيراد ETL',
    'etl.subtitle': 'قم باستيراد ملفات PDF أو صور أو CSV للاستخراج التلقائي وتغذية مؤشرات المنصة.',
    'etl.drop': 'أسقط ملفاتك هنا أو انقر للاختيار',
    'etl.drop_sub': 'PDF، PNG، JPG، CSV — يُقبل ملفات متعددة',
    'etl.pending_title': 'الملفات المعلقة',
    'etl.launch': 'بدء الاستيراد',
    'etl.type': 'النوع',
    'etl.remove': 'إزالة',
    'etl.pipeline_title': 'خط أنابيب الاستيراد',
    'etl.batch_label': 'ملفات',
    'etl.step.upload': 'إرسال الملف',
    'etl.step.queue': 'قائمة الانتظار',
    'etl.step.ocr': 'استخراج OCR',
    'etl.step.validate': 'التحقق من البيانات',
    'etl.step.store': 'تخزين قاعدة البيانات',
    'etl.step.push': 'إرسال للمنصة',
    'etl.live': 'تدفق مباشر',
    'etl.result.title': 'نتائج الاستخراج',
    'etl.result.quality': 'الجودة',
    'etl.result.records': 'سجل',
    'etl.result.anomalies': 'شذوذ',
    'etl.result.kpis': 'مؤشرات KPI',
    'etl.result.alert': 'تنبيه مُطلق',
    'etl.result.domain': 'المجال',
    'etl.result.preview': 'معاينة البيانات المستخرجة',
    'etl.error': 'خطأ في المعالجة',
    // Language switcher
    'lang.toggle': 'FR',
  },
}

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('ucar_lang') || 'fr')

  function setLang(l) {
    setLangState(l)
    localStorage.setItem('ucar_lang', l)
  }

  function toggleLang() {
    setLang(lang === 'fr' ? 'ar' : 'fr')
  }

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    document.body.style.fontFamily =
      lang === 'ar'
        ? "'Cairo', 'Inter', sans-serif"
        : "'Inter', sans-serif"
  }, [lang])

  function t(key) {
    return T[lang]?.[key] ?? T.fr[key] ?? key
  }

  const dateLocale = lang === 'ar' ? 'ar-TN' : 'fr-FR'

  return (
    <LangContext.Provider value={{ lang, setLang, toggleLang, t, isRTL: lang === 'ar', dateLocale }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}
