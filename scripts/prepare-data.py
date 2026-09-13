from pathlib import Path
import csv,json,re,unicodedata
base=Path('MAQUETTE ET HANDOFF'); out=Path('src/lib')
data=json.loads((base/'DEMO_DATA.json').read_text())
data['recommandations'][0]['calcul']['roas_campagne']=4.12
data['recommandations'][0]['actions']=['Transférer 150 000 FCFA du budget de « Acquisition — Large 25-45 »','Ajouter 150 000 FCFA à « Promo Tabaski — Carrousel » et reprendre la diffusion']
data['recommandations'][2]['titre']='Fatigue créative sur « Offre livraison gratuite »';data['recommandations'][2]['calcul']['frequence']=5.2
data['recommandations'][3]['titre']='Élargir l’audience « Large 25-45 — Sénégal »'
data['ensembles'][1]['depense']=148900
data['publicites'][0]['depense']=86200;data['publicites'][1]['depense']=62700
(out/'demo.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
paths={
'A1':'/','A2':'/fonctionnalites','A3':'/tarifs','A4':'/connexion','A5':'/inscription','A6':'/mot-de-passe-oublie','A7':'/legal/mentions','A8':'/contact',
'B1':'/bienvenue','B2':'/configuration/meta','B3':'/configuration/business-manager','B4':'/configuration/comptes','B5':'/configuration/pages','B6':'/configuration/pixel','B7':'/configuration/entreprise','B8':'/configuration/analyse-site','B9':'/configuration/recapitulatif','B10':'/configuration/plan','B11':'/configuration/terminee',
'C1.1':'/app/tableau-de-bord','C1.2':'/app/comptes',
'C2.1':'/app/agent','C2.2':'/app/agent/recommandation','C2.3':'/app/agent/confirmation','C2.4':'/app/agent/historique','C2.5':'/app/agent/reglages',
'C3.1':'/app/campagnes','C3.2':'/app/ensembles','C3.3':'/app/publicites',
'C4.1':'/app/creation/mode','C4.2':'/app/creation/brief','C4.3':'/app/creation/proposition','C4.4':'/app/creation/campagne','C4.5':'/app/creation/ciblage','C4.6':'/app/creation/creatives','C4.7':'/app/creation/textes','C4.8':'/app/creation/apercu','C4.9':'/app/creation/publication',
'C5.1':'/app/studio','C5.2':'/app/studio/textes','C5.3':'/app/studio/visuels','C5.4':'/app/studio/videos','C5.5':'/app/studio/resultats','C5.6':'/app/studio/retouche','C5.7':'/app/studio/bibliotheque',
'C6.1':'/app/analyse','C6.2':'/app/analyse/creative','C6.3':'/app/analyse/elements','C6.4':'/app/analyse/fatigue','C6.5':'/app/analyse/gagnants','C6.6':'/app/analyse/iterations',
'C7.1':'/app/regles','C7.2':'/app/regles/creer','C7.3':'/app/regles/historique',
'C8.1':'/app/marche','C8.2':'/app/marche/publicite','C8.3':'/app/marche/collections','C8.4':'/app/marche/collection','C8.5':'/app/marche/analyser','C8.6':'/app/marche/analyse','C8.7':'/app/marche/axes','C8.8':'/app/marche/historique',
'C9.1':'/app/rapports','C9.2':'/app/rapports/editeur','C9.3':'/app/rapports/modeles','C9.4':'/app/rapports/partage','C9.5':'/rapport/demo',
'C10.1':'/app/business-brain','C10.2':'/app/business-brain/produits','C10.3':'/app/business-brain/historique',
'C11.1':'/app/parametres','C11.2':'/app/parametres/meta','C11.3':'/app/parametres/abonnement','C11.4':'/app/parametres/credits','C11.5':'/app/parametres/facturation','C11.6':'/app/parametres/notifications','C11.7':'/app/parametres/equipe','C11.8':'/app/parametres/securite'}
fix={'C4.7':'Textes publicitaires','C4.9':'Récapitulatif et publication','C5.7':'Bibliothèque personnelle','C6.5':'Gagnants enterrés','C6.6':'Propositions d’itérations','C8.2':'Détail d’une publicité','C8.3':'Mes collections','C8.4':'Détail d’une collection','C8.5':'Lancer une analyse de marché','C8.6':'Rapport d’analyse de marché','C8.7':'Axes de communication recommandés','C8.8':'Historique des analyses','C9.3':'Modèles de rapport','C9.4':'Paramètres de partage'}
rows=[]
for r in csv.DictReader((base/'SCREENS_MANIFEST.csv').open()):
 if r['reference']=='C7.x': continue
 rows.append({'ref':r['reference'],'title':fix.get(r['reference'],r['titre']),'group':r['module'],'path':paths[r['reference']]})
for ref,title in [('C7.1','Règles automatisées'),('C7.2','Créer une règle'),('C7.3','Historique des règles')]:rows.append({'ref':ref,'title':title,'group':'Règles automatisées','path':paths[ref]})
for ref,title,path in [('verify','Vérifiez votre boîte e-mail','/verification'),('reset','Nouveau mot de passe','/nouveau-mot-de-passe'),('terms','Conditions générales','/legal/conditions'),('privacy','Confidentialité','/legal/confidentialite'),('cookies','Cookies','/legal/cookies'),('directory','Toutes les pages','/parcours')]:rows.append({'ref':ref,'title':title,'group':'Public','path':path})
(out/'screens.ts').write_text('export type Screen = {ref: string; title: string; group: string; path: string};\nexport const screens: Screen[] = '+json.dumps(rows,ensure_ascii=False,indent=2)+';\nexport const route = (ref: string) => screens.find(s => s.ref === ref)?.path ?? "/app/tableau-de-bord";\n')
print(len(rows),'routes préparées')
