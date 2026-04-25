INSERT INTO alerts (id, institution_id, domain, severity, title, description, kpi_name, kpi_value, threshold_value, is_resolved, created_at, resolved_at) VALUES
(1, 7, 'academic', 'critical',
'Pic anormal du taux d''abandon au semestre S1 2023',
'Le système d''analyse prédictive a détecté une hausse brutale du taux d''abandon étudiant à la Faculté concernée, atteignant un niveau très supérieur à la norme institutionnelle. Cette dégradation s''accompagne d''une chute simultanée du taux de réussite, ce qui suggère une perturbation structurelle de l''encadrement pédagogique. Une corrélation forte est également observée avec l''alerte RH sur l''absentéisme du personnel enseignant durant la même période.',
'dropout_rate', 21.38, 8.00, FALSE, '2023-11-14 08:45:00', NULL),

(2, 7, 'hr', 'critical',
'Taux d''absentéisme enseignant exceptionnellement élevé',
'Une augmentation inhabituelle de l''absentéisme du corps enseignant a été identifiée au cours du semestre S1 2023. Le niveau enregistré dépasse largement le seuil de vigilance et a probablement réduit la continuité des cours, des évaluations et du suivi académique. Cette situation présente une cohérence directe avec l''alerte académique signalant une hausse du décrochage et une baisse du rendement étudiant.',
'absenteeism_rate', 23.70, 9.00, FALSE, '2023-10-29 09:10:00', NULL),

(3, 12, 'academic', 'warning',
'Baisse critique du taux de présence étudiante',
'L''analyse des données de présence montre une chute marquée de l''assiduité au semestre S2 2022, avec un niveau inférieur de moitié aux standards observés dans les autres établissements comparables. Ce comportement peut traduire un dysfonctionnement d''organisation pédagogique, un problème de calendrier ou une démotivation généralisée. Sans action corrective rapide, un impact sur les résultats du semestre suivant est fortement probable.',
'attendance_rate', 41.30, 75.00, FALSE, '2023-04-17 11:20:00', NULL),

(4, 3, 'academic', 'warning',
'Régression importante des inscriptions en S1 2023',
'Le moteur de détection a relevé une contraction significative du volume des étudiants inscrits par rapport au semestre précédent. La baisse dépasse le seuil tolérable de variation naturelle et peut indiquer une perte d''attractivité institutionnelle, des reports d''inscription ou des transferts massifs. Une analyse complémentaire des admissions et des réorientations est recommandée.',
'total_enrolled', 2749.00, 3500.00, FALSE, '2023-09-26 10:05:00', NULL),

(5, 5, 'finance', 'warning',
'Taux d''exécution budgétaire proche de saturation avant clôture',
'Le budget consommé sur l''exercice 2023 atteint déjà un niveau exceptionnellement élevé alors que plusieurs mois administratifs restent à couvrir. Cette cadence de dépense expose l''établissement à un risque de tension de trésorerie sur les engagements de fin d''année. Une priorisation immédiate des dépenses non essentielles est conseillée.',
'budget_execution_rate', 97.80, 95.00, FALSE, '2023-10-18 14:30:00', NULL),

(6, 19, 'finance', 'critical',
'Dépassement budgétaire constaté sur l''exercice 2023',
'Le module financier a détecté un dépassement réel de l''enveloppe allouée, avec des consommations supérieures au budget voté. Cette dérive de plus de huit pour cent traduit soit une sous-estimation initiale, soit une absence de mécanisme de contrôle intermédiaire suffisamment réactif. Une revue urgente des engagements contractuels et des postes de dépense est nécessaire.',
'budget_execution_rate', 108.00, 100.00, FALSE, '2023-11-07 15:10:00', NULL),

(7, 8, 'finance', 'info',
'Investissement scientifique insuffisant dans le budget recherche',
'La part budgétaire réservée aux activités de recherche est extrêmement faible comparativement aux standards d''une grande école d''ingénieurs. Ce niveau de financement limite la capacité de publication, d''équipement de laboratoire et de participation aux projets nationaux ou internationaux. L''anomalie ne crée pas de rupture immédiate, mais constitue un signal stratégique de sous-investissement.',
'research_budget_pct', 0.40, 5.00, FALSE, '2022-10-12 09:40:00', NULL);
INSERT INTO users (id, email, password_hash, full_name, role, institution_id, is_active, created_at) VALUES
(1, 'president@ucar.rnu.tn', '$2b$12$fakehashfordemopurposes', 'Mohamed Salah Ben Aissa', 'presidency', NULL, TRUE, '2022-09-01 08:00:00'),

(2, 'admin.fsegn@ucar.rnu.tn', '$2b$12$fakehashfordemopurposes', 'Amel Trabelsi Ghariani', 'institution_admin', 3, TRUE, '2022-09-05 09:15:00'),
(3, 'admin.enstab@ucar.rnu.tn', '$2b$12$fakehashfordemopurposes', 'Nizar Ben Mahmoud', 'institution_admin', 7, TRUE, '2022-09-05 09:30:00'),
(4, 'admin.essths@ucar.rnu.tn', '$2b$12$fakehashfordemopurposes', 'Sonia Khelifi Jlassi', 'institution_admin', 12, TRUE, '2022-09-05 09:45:00'),

(5, 'viewer.ihec@ucar.rnu.tn', '$2b$12$fakehashfordemopurposes', 'Walid Hichem Charfi', 'viewer', 13, TRUE, '2022-09-10 10:20:00'),
(6, 'viewer.supcom@ucar.rnu.tn', '$2b$12$fakehashfordemopurposes', 'Rim Ben Salem Toumi', 'viewer', 33, TRUE, '2022-09-10 10:35:00');
