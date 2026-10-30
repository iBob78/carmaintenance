// Rapport de vente — mise en page PDF (@react-pdf/renderer).
// Le document ne reçoit QUE des données déjà filtrées par les règles de
// confidentialité (voir applyPrivacy) : les champs masqués n'existent plus
// dans les données au moment de la mise en page.

import React from 'react'
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import type { ReportOptions } from '../options'
import { SECTION_LABELS, type ReportSection } from '../options'
import type { ReportSnapshot, SnapshotServiceRecord } from '../snapshot'
import {
  CARBURANT_LABELS,
  EXPENSE_CATEGORY_LABELS,
  FAULT_STATUS_LABELS,
  SERVICE_STATUS_LABELS,
  SOURCE_LABELS,
  categoryLabel,
} from './labels'
import {
  formatDate,
  formatDateShort,
  formatEuro,
  formatKm,
} from '../../domain/format'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const C = {
  ink: '#0f172a',
  slate: '#475569',
  muted: '#94a3b8',
  line: '#e2e8f0',
  soft: '#f8fafc',
  brand: '#4338ca',
  brandSoft: '#eef2ff',
  rose: '#be123c',
  roseSoft: '#fff1f2',
  amber: '#b45309',
  amberSoft: '#fffbeb',
  emerald: '#047857',
  emeraldSoft: '#ecfdf5',
  white: '#ffffff',
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.ink,
    paddingVertical: 56,
    paddingHorizontal: 48,
    lineHeight: 1.45,
  },
  // Couverture
  coverBrand: { fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: C.brand, fontWeight: 'bold' },
  coverTitle: { fontSize: 22, fontWeight: 'bold', color: C.ink, marginTop: 10, lineHeight: 1.25 },
  coverSubtitle: { fontSize: 12, color: C.slate, marginTop: 6 },
  coverRule: { borderBottomWidth: 2, borderBottomColor: C.ink, marginVertical: 22, width: 64 },
  coverVehicle: { fontSize: 16, fontWeight: 'bold', color: C.ink },
  coverVehicleSub: { fontSize: 10, color: C.slate, marginTop: 3 },
  kpiRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  kpiBox: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    padding: 10,
    backgroundColor: C.soft,
  },
  kpiValue: { fontSize: 15, fontWeight: 'bold', color: C.ink },
  kpiLabel: { fontSize: 7.5, color: C.slate, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  notice: {
    borderLeftWidth: 3,
    borderLeftColor: C.amber,
    backgroundColor: C.amberSoft,
    padding: 10,
    marginTop: 18,
    fontSize: 8.5,
    color: C.ink,
  },
  noticeRose: {
    borderLeftWidth: 3,
    borderLeftColor: C.rose,
    backgroundColor: C.roseSoft,
    padding: 10,
    marginTop: 12,
    fontSize: 8.5,
    color: C.ink,
  },
  coverFooter: { position: 'absolute', bottom: 56, left: 48, right: 48, fontSize: 7.5, color: C.muted },
  // Sommaire
  tocTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  tocIntro: { fontSize: 9, color: C.slate, marginBottom: 18 },
  tocRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingVertical: 7 },
  tocRowText: { fontSize: 10, color: C.ink },
  tocRowNum: { fontSize: 10, color: C.slate },
  tocRowPage: { fontSize: 9, color: C.slate, marginLeft: 8 },
  tocSep: { borderBottomWidth: 1, borderBottomColor: C.line, borderStyle: 'dashed' },
  // Sections
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: C.ink },
  sectionNumber: { fontSize: 9, color: C.brand, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 'bold' },
  sectionRule: { borderBottomWidth: 2, borderBottomColor: C.brand, marginTop: 6, marginBottom: 14 },
  h3: { fontSize: 10.5, fontWeight: 'bold', color: C.ink, marginTop: 12, marginBottom: 5 },
  p: { fontSize: 9, color: C.ink, marginBottom: 5 },
  pMuted: { fontSize: 8.5, color: C.slate },
  small: { fontSize: 7.5, color: C.muted },
  // Tableaux
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 4.5 },
  tableHead: { backgroundColor: C.soft },
  th: { fontSize: 7.5, fontWeight: 'bold', color: C.slate, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { fontSize: 8.5, color: C.ink },
  tdBold: { fontSize: 8.5, color: C.ink, fontWeight: 'bold' },
  tdMuted: { fontSize: 8, color: C.slate },
  // Cartes d'intervention — filet bas uniquement : les bordures complètes
  // provoquent un bug de layout react-pdf aux frontières de pages (clipBorderTop).
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 10, marginBottom: 9 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 10, fontWeight: 'bold', color: C.ink, width: '62%' },
  cardMeta: { fontSize: 8, color: C.slate, marginTop: 2 },
  badge: { fontSize: 7, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 3, overflow: 'hidden' },
  badgeGreen: { backgroundColor: C.emeraldSoft, color: C.emerald },
  badgeAmber: { backgroundColor: C.amberSoft, color: C.amber },
  badgeRose: { backgroundColor: C.roseSoft, color: C.rose },
  badgeSlate: { backgroundColor: C.soft, color: C.slate },
  badgeBrand: { backgroundColor: C.brandSoft, color: C.brand },
  kvRow: { flexDirection: 'row', marginBottom: 2.5 },
  kvKey: { width: 168, fontSize: 8, color: C.slate },
  kvVal: { flex: 1, fontSize: 8.5, color: C.ink },
  kvMissing: { flex: 1, fontSize: 8.5, color: C.muted, fontStyle: 'italic' },
  // Pied de page
  footer: {
    position: 'absolute',
    left: 48,
    right: 48,
    bottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 6,
    fontSize: 7,
    color: C.muted,
  },
  footerStrong: { fontSize: 7, color: C.slate, fontWeight: 'bold' },
})

// ---------------------------------------------------------------------------
// Petits composants
// ---------------------------------------------------------------------------

function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'green' | 'amber' | 'rose' | 'brand' }) {
  const tones = {
    slate: s.badgeSlate,
    green: s.badgeGreen,
    amber: s.badgeAmber,
    rose: s.badgeRose,
    brand: s.badgeBrand,
  } as const
  return <Text style={[s.badge, tones[tone]]}>{children}</Text>
}

function KV({ k, v, missing }: { k: string; v?: string | number | null; missing?: boolean }) {
  return (
    <View style={s.kvRow} wrap={false}>
      <Text style={s.kvKey}>{k}</Text>
      {missing ? (
        <Text style={s.kvMissing}>non renseigné</Text>
      ) : (
        <Text style={s.kvVal}>{v != null ? String(v) : '—'}</Text>
      )}
    </View>
  )
}

function SectionTitle({ index, section }: { index: number; section: ReportSection }) {
  return (
    <View fixed>
      <Text style={s.sectionNumber}>Section {index}</Text>
      <Text style={s.sectionTitle}>{SECTION_LABELS[section]}</Text>
      <View style={s.sectionRule} />
    </View>
  )
}

function TableHead({ cols, widths }: { cols: string[]; widths: number[] }) {
  return (
    <View style={[s.tableRow, s.tableHead]} fixed>
      {cols.map((c, i) => (
        <Text key={c} style={[s.th, { width: `${widths[i]}%` }]}>
          {c}
        </Text>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Contenu des sections
// ---------------------------------------------------------------------------

function IdentificationSection({ snapshot }: { snapshot: ReportSnapshot }) {
  const v = snapshot.vehicle
  return (
    <View>
      <SectionTitle index={1} section="identification" />
      <View style={s.card}>
        <Text style={s.h3}>Caractéristiques</Text>
        <KV k="Marque / modèle" v={`${v.marque} ${v.modele}`} />
        <KV k="Génération" v={v.generation} missing={!v.generation} />
        <KV k="Finition" v={v.finition} missing={!v.finition} />
        <KV k="Année" v={v.annee} />
        <KV k="Première immatriculation" v={v.premiereImmatriculation} missing={!v.premiereImmatriculation} />
        <KV k="Motorisation" v={v.motorisation} missing={!v.motorisation} />
        <KV k="Code moteur" v={v.codeMoteur} missing={!v.codeMoteur} />
        <KV k="Cylindrée" v={v.cylindreeCm3 ? `${v.cylindreeCm3} cm³` : null} missing={!v.cylindreeCm3} />
        <KV k="Carburant" v={CARBURANT_LABELS[v.carburant]} />
        <KV k="Transmission" v={v.transmission ?? null} missing={!v.transmission} />
        <KV k="VIN" v={v.vin} missing={!v.vin} />
        <KV k="Immatriculation" v={v.immatriculation} missing={!v.immatriculation} />
        <KV k="Date d’acquisition" v={v.dateAcquisition ? formatDate(v.dateAcquisition) : null} missing={!v.dateAcquisition} />
        <KV k="Couleur" v={v.couleur} missing={!v.couleur} />
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Relevés kilométriques connus</Text>
        {snapshot.odometerReadings.length === 0 ? (
          <Text style={s.pMuted}>Aucun relevé kilométrique daté n’a été enregistré.</Text>
        ) : (
          <View>
            <TableHead cols={['Date', 'Kilométrage', 'Source', 'Justificatif']} widths={[18, 22, 34, 26]} />
            {snapshot.odometerReadings
              .slice()
              .reverse()
              .slice(0, 8)
              .map((r) => (
                <View key={r.id} style={s.tableRow} wrap={false}>
                  <Text style={[s.td, { width: '18%' }]}>{formatDateShort(r.date)}</Text>
                  <Text style={[s.td, { width: '22%' }]}>{formatKm(r.valeurKm)}</Text>
                  <Text style={[s.tdMuted, { width: '34%' }]}>{SOURCE_LABELS[r.sourceInformation]}</Text>
                  <Text style={[s.tdMuted, { width: '26%' }]}>{r.documentId ? 'oui' : 'aucun'}</Text>
                </View>
              ))}
          </View>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Kilométrage couvert par le rapport</Text>
        <KV
          k="Plage reconstituée"
          v={
            snapshot.kmRange.min != null && snapshot.kmRange.max != null
              ? `${formatKm(snapshot.kmRange.min)} — ${formatKm(snapshot.kmRange.max)}`
              : null
          }
          missing={snapshot.kmRange.min == null}
        />
        <KV k="Origine des données" v={snapshot.kmRange.source === 'releves' ? 'relevés kilométriques datés' : snapshot.kmRange.source === 'interventions' ? 'interventions enregistrées' : 'indisponible'} />
      </View>

      {snapshot.missingFields.length > 0 && (
        <View style={s.notice}>
          <Text style={{ fontWeight: 'bold' }}>Données non renseignées : </Text>
          <Text>
            {snapshot.missingFields.join(', ')}. Ces éléments n’ont pas été inventés ni déduits : ils
            apparaissent comme absents du rapport.
          </Text>
        </View>
      )}
    </View>
  )
}

function ServiceRecordCard({ entry, includeCosts }: { entry: SnapshotServiceRecord; includeCosts: boolean }) {
  const r = entry.record
  const statusTone =
    r.statut === 'effectue' ? 'green' : r.statut === 'prevu' ? 'brand' : r.statut === 'annule' ? 'rose' : 'amber'
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View style={{ width: '62%' }}>
          <Text style={s.cardTitle}>{r.titre}</Text>
          <Text style={s.cardMeta}>
            {formatDateShort(r.date)} · {formatKm(r.kilometrage)} · {categoryLabel(r.categorie)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Badge tone={statusTone}>{SERVICE_STATUS_LABELS[r.statut]}</Badge>
          {includeCosts && r.coutTotal != null && <Badge tone="slate">{formatEuro(r.coutTotal, true)}</Badge>}
        </View>
      </View>

      <View style={{ marginTop: 4 }}>
        {r.description ? <KV k="Description" v={r.description} /> : null}
        <KV k="Réalisation" v={r.realisateur === 'proprietaire' ? 'Propriétaire' : r.realisateur === 'garage' ? 'Garage' : 'Professionnel'} />
        {r.garage ? <KV k="Garage / atelier" v={r.garage} /> : null}
        <KV k="Origine de l’information" v={SOURCE_LABELS[r.sourceInformation]} />
        {r.notes ? <KV k="Notes" v={r.notes} /> : null}
      </View>

      {entry.items.length > 0 && (
        <View style={{ marginTop: 6 }}>
          <Text style={[s.th, { marginBottom: 3 }]}>Pièces, consommables et main-d’œuvre</Text>
          <TableHead cols={['Type', 'Désignation', 'Référence', 'Qté', 'Montant']} widths={[16, 38, 22, 8, 16]} />
          {entry.items.map((it) => (
            <View key={it.id} style={s.tableRow} wrap={false}>
              <Text style={[s.tdMuted, { width: '16%' }]}>
                {it.kind === 'piece' ? 'Pièce' : it.kind === 'consommable' ? 'Conso.' : it.kind === 'main_oeuvre' ? 'M.O.' : it.kind === 'prestation' ? 'Prestation' : 'Autre'}
              </Text>
              <Text style={[s.td, { width: '38%' }]}>{it.libelle}</Text>
              <Text style={[s.tdMuted, { width: '22%' }]}>
                {it.reference ? `${it.marque ? it.marque + ' ' : ''}${it.reference}` : '—'}
              </Text>
              <Text style={[s.td, { width: '8%' }]}>{it.quantite}</Text>
              <Text style={[s.td, { width: '16%' }]}>
                {includeCosts ? (it.prixTotal != null ? formatEuro(it.prixTotal, true) : '—') : '••••'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {entry.documents.length > 0 && (
        <Text style={[s.small, { marginTop: 5 }]}>
          Justificatifs liés : {entry.documents.map((d) => d.filename).join(', ')}
        </Text>
      )}
    </View>
  )
}

function HistorySection({ snapshot, options }: { snapshot: ReportSnapshot; options: ReportOptions }) {
  return (
    <View>
      <SectionTitle index={2} section="historique" />
      <Text style={s.pMuted}>
        {snapshot.counts.interventions} intervention(s) enregistrée(s) sur la période
        {snapshot.period.from || snapshot.period.to
          ? ` (${snapshot.period.from ? formatDateShort(snapshot.period.from) : 'début'} → ${snapshot.period.to ? formatDateShort(snapshot.period.to) : 'aujourd’hui'})`
          : ' (historique complet)'}
        . Seules les données réellement saisies figurent ici ; une intervention non enregistrée
        n’apparaît pas.
      </Text>
      <View style={{ marginTop: 10 }}>
        {snapshot.serviceRecords.length === 0 ? (
          <Text style={s.pMuted}>Aucune intervention enregistrée pour cette période.</Text>
        ) : (
          snapshot.serviceRecords.map((entry) => (
            <ServiceRecordCard key={entry.record.id} entry={entry} includeCosts={options.includeCosts} />
          ))
        )}
      </View>
    </View>
  )
}

function FaultsSection({ snapshot }: { snapshot: ReportSnapshot }) {
  return (
    <View>
      <SectionTitle index={3} section="pannes" />
      <Text style={s.pMuted}>
        Pannes, symptômes et réparations tels qu’enregistrés par le propriétaire. L’absence de panne
        enregistrée ne constitue pas une preuve d’absence de défaut.
      </Text>
      <View style={{ marginTop: 10 }}>
        {snapshot.faults.length === 0 ? (
          <View style={s.notice}>
            <Text>
              Aucune panne ni réparation n’a été enregistrée pour ce véhicule sur la période
              sélectionnée. Ce constat reflète uniquement l’absence de saisie.
            </Text>
          </View>
        ) : (
          snapshot.faults.map((f) => {
            const tone =
              f.statut === 'resolu' ? 'green' : f.statut === 'ouvert' ? 'rose' : f.statut === 'reapparu' ? 'rose' : 'amber'
            return (
              <View key={f.id} style={s.card}>
                <View style={s.cardHead}>
                  <Text style={s.cardTitle}>{f.symptomes}</Text>
                  <Badge tone={tone}>{FAULT_STATUS_LABELS[f.statut]}</Badge>
                </View>
                <View style={{ marginTop: 5 }}>
                  <KV k="Signalé le" v={formatDate(f.dateSignalement)} />
                  {f.dateResolution ? <KV k="Résolu le" v={formatDate(f.dateResolution)} /> : null}
                  {f.circonstances ? <KV k="Circonstances" v={f.circonstances} /> : null}
                  {f.codesDefaut ? <KV k="Codes défaut" v={f.codesDefaut} /> : null}
                  {f.hypothese ? <KV k="Hypothèses" v={f.hypothese} /> : null}
                  {f.testsRealises ? <KV k="Tests réalisés" v={f.testsRealises} /> : null}
                  {f.resultat ? <KV k="Résultats" v={f.resultat} /> : null}
                  {f.piecesRemplacees ? <KV k="Pièces remplacées" v={f.piecesRemplacees} /> : null}
                  <KV k="Origine de l’information" v={SOURCE_LABELS[f.sourceInformation]} />
                </View>
              </View>
            )
          })
        )}
      </View>
    </View>
  )
}

function DocumentsSection({ snapshot, options }: { snapshot: ReportSnapshot; options: ReportOptions }) {
  const included = snapshot.attachments.filter((a) => a.included)
  return (
    <View>
      <SectionTitle index={4} section="justificatifs" />
      <Text style={s.pMuted}>
        Index des justificatifs enregistrés. Les fichiers sont stockés de façon privée ; ce rapport
        n’inclut que les pièces explicitement sélectionnées.
      </Text>

      <View style={{ marginTop: 10 }}>
        <TableHead cols={['Identifiant', 'Nom du fichier', 'Type', 'Date', 'Intervention liée']} widths={[18, 30, 16, 16, 20]} />
        {snapshot.documents.length === 0 ? (
          <Text style={[s.pMuted, { marginTop: 6 }]}>Aucun justificatif enregistré.</Text>
        ) : (
          snapshot.documents.map((d) => (
            <View key={d.id} style={s.tableRow} wrap={false}>
              <Text style={[s.tdMuted, { width: '18%' }]}>{d.id.slice(0, 12)}</Text>
              <Text style={[s.td, { width: '30%' }]}>{d.filename}</Text>
              <Text style={[s.tdMuted, { width: '16%' }]}>
                {d.kind === 'facture' ? 'Facture' : d.kind === 'photo' ? 'Photo' : d.kind === 'pv_controle' ? 'PV contrôle' : 'Autre'}
              </Text>
              <Text style={[s.tdMuted, { width: '16%' }]}>{formatDateShort(d.dateDocument)}</Text>
              <Text style={[s.tdMuted, { width: '20%' }]}>{d.serviceRecordId ? d.serviceRecordId.slice(0, 10) : '—'}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={s.h3}>Pièces jointes sélectionnées pour ce rapport</Text>
      {!options.includeAttachments ? (
        <View style={s.notice}>
          <Text>
            L’intégration des pièces jointes est désactivée dans les options de ce rapport. Seul
            l’index ci-dessus est fourni.
          </Text>
        </View>
      ) : snapshot.attachments.filter((a) => a.document.kind !== 'autre').length === 0 ? (
        <Text style={s.pMuted}>Aucune pièce jointe sélectionnée.</Text>
      ) : (
        snapshot.attachments
          .filter((a) => options.attachmentIds.includes(a.document.id))
          .map((a) => (
            <View key={a.document.id} style={a.included ? s.card : s.noticeRose}>
              <View style={s.cardHead}>
                <Text style={s.cardTitle}>{a.document.filename}</Text>
                <Badge tone={a.included ? 'green' : 'rose'}>
                  {a.included ? 'Incluse' : 'Non incluse'}
                </Badge>
              </View>
              <Text style={[s.pMuted, { marginTop: 4 }]}>
                {a.included
                  ? 'Pièce jointe intégrée au rapport (contenu disponible au moment de la génération).'
                  : a.reason}
              </Text>
            </View>
          ))
      )}
    </View>
  )
}

function ExpensesSection({ snapshot, options }: { snapshot: ReportSnapshot; options: ReportOptions }) {
  const t = snapshot.totals
  return (
    <View>
      <SectionTitle index={5} section="depenses" />
      {!options.includeCosts ? (
        <View style={s.notice}>
          <Text>
            Les montants sont masqués à la demande de l’utilisateur. Le nombre de dépenses
            enregistrées sur la période est de {t.nbDepenses}.
          </Text>
        </View>
      ) : (
        <View>
          <View style={s.card}>
            <Text style={s.h3}>Totaux sur la période</Text>
            <KV k="Dépenses brutes enregistrées" v={formatEuro(t.brut, true)} />
            <KV k="Remboursements" v={formatEuro(-t.remboursements, true)} />
            <KV k="Total net" v={formatEuro(t.net, true)} />
            <KV k="Nombre de dépenses" v={t.nbDepenses} />
          </View>

          <View style={s.card}>
            <Text style={s.h3}>Ventilation par catégorie (net)</Text>
            <TableHead cols={['Catégorie', 'Montant net']} widths={[70, 30]} />
            {Object.entries(t.parCategorie)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amount]) => (
                <View key={cat} style={s.tableRow} wrap={false}>
                  <Text style={[s.td, { width: '70%' }]}>
                    {cat === 'inconnu'
                      ? 'Dépenses non catégorisées (nature inconnue)'
                      : EXPENSE_CATEGORY_LABELS[cat as keyof typeof EXPENSE_CATEGORY_LABELS] ?? cat}
                  </Text>
                  <Text style={[s.td, { width: '30%' }]}>{formatEuro(amount, true)}</Text>
                </View>
              ))}
          </View>

          <View style={s.card}>
            <Text style={s.h3}>Ventilation par année</Text>
            <TableHead cols={['Année', 'Brut', 'Net']} widths={[30, 35, 35]} />
            {Object.entries(t.parAnnee)
              .sort((a, b) => Number(b[0]) - Number(a[0]))
              .map(([year, bucket]) => (
                <View key={year} style={s.tableRow} wrap={false}>
                  <Text style={[s.td, { width: '30%' }]}>{year}</Text>
                  <Text style={[s.td, { width: '35%' }]}>{formatEuro(bucket.brut, true)}</Text>
                  <Text style={[s.td, { width: '35%' }]}>{formatEuro(bucket.net, true)}</Text>
                </View>
              ))}
          </View>

          <View style={s.card}>
            <Text style={s.h3}>Règles de comptage appliquées</Text>
            <Text style={s.pMuted}>
              · Les dépenses liées à une intervention enregistrée ({formatEuro(t.lieesInterventions, true)} net)
              sont comptées une seule fois et ne sont pas re-comptées dans les achats de pièces.
            </Text>
            <Text style={s.pMuted}>
              · Les achats de pièces déjà portés par une dépense ne sont pas comptabilisés deux fois.
            </Text>
            <Text style={s.pMuted}>
              · Les remboursements ({formatEuro(t.remboursements, true)}) sont déduits des totaux nets.
            </Text>
            {t.inconnues > 0 && (
              <Text style={s.pMuted}>
                · Dont {formatEuro(t.inconnues, true)} de dépenses dont la nature exacte n’est pas connue
                (signalées comme telles, sans catégorisation supposée).
              </Text>
            )}
          </View>

          <Text style={s.h3}>Détail des dépenses</Text>
          <TableHead cols={['Date', 'Libellé', 'Catégorie', 'Montant', 'Remb.', 'Net']} widths={[14, 32, 18, 12, 12, 12]} />
          {snapshot.expenses.map((e) => (
            <View key={e.id} style={s.tableRow} wrap={false}>
              <Text style={[s.tdMuted, { width: '14%' }]}>{formatDateShort(e.date)}</Text>
              <Text style={[s.td, { width: '32%' }]}>{e.libelle}{e.inconnu ? ' (nature inconnue)' : ''}</Text>
              <Text style={[s.tdMuted, { width: '18%' }]}>
                {e.inconnu ? 'Inconnue' : EXPENSE_CATEGORY_LABELS[e.categorie]}
              </Text>
              <Text style={[s.td, { width: '12%' }]}>{formatEuro(e.montant, true)}</Text>
              <Text style={[s.td, { width: '12%' }]}>{e.remboursement ? formatEuro(e.remboursement, true) : '—'}</Text>
              <Text style={[s.td, { width: '12%' }]}>{formatEuro(e.montant - (e.remboursement ?? 0), true)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function UpcomingSection({ snapshot }: { snapshot: ReportSnapshot }) {
  return (
    <View>
      <SectionTitle index={6} section="travaux_prevoir" />
      <View style={s.notice}>
        <Text>
          Cette section est calculée à partir des intervalles déclarés et des interventions
          réellement enregistrées. L’absence de travaux listés ne constitue pas une preuve qu’aucun
          travail n’est à prévoir.
        </Text>
      </View>

      <Text style={s.h3}>Échéances d’entretien connues</Text>
      {snapshot.dues.length === 0 ? (
        <Text style={s.pMuted}>Aucune échéance en retard ou proche n’a été calculée.</Text>
      ) : (
        <View>
          <TableHead cols={['Opération', 'Échéance', 'Situation']} widths={[36, 30, 34]} />
          {snapshot.dues.map((d, i) => (
            <View key={`${d.categorie}-${i}`} style={s.tableRow} >
              <Text style={[s.td, { width: '36%' }]}>{d.libelle}</Text>
              <Text style={[s.tdMuted, { width: '30%' }]}>
                {d.dueKm != null ? formatKm(d.dueKm) : ''}
                {d.dueKm != null && d.dueDate ? ' ou ' : ''}
                {d.dueDate != null ? formatDateShort(d.dueDate) : ''}
              </Text>
              <Text style={[s.td, { width: '34%' }]}>
                {d.urgency === 'retard'
                  ? 'EN RETARD'
                  : d.kmRemaining != null
                    ? `reste ${formatKm(Math.max(0, d.kmRemaining))}`
                    : d.daysRemaining != null
                      ? `reste ${Math.max(0, d.daysRemaining)} jour(s)`
                      : '—'}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.h3}>Défauts non résolus</Text>
      {snapshot.faults.filter((f) => f.statut !== 'resolu').length === 0 ? (
        <Text style={s.pMuted}>Aucun défaut non résolu n’est enregistré (données saisies uniquement).</Text>
      ) : (
        snapshot.faults
          .filter((f) => f.statut !== 'resolu')
          .map((f) => (
            <View key={f.id} style={s.card}>
              <View style={s.cardHead}>
                <Text style={s.cardTitle}>{f.symptomes}</Text>
                <Badge tone="rose">{FAULT_STATUS_LABELS[f.statut]}</Badge>
              </View>
              {f.hypothese ? <Text style={[s.pMuted, { marginTop: 4 }]}>Hypothèses : {f.hypothese}</Text> : null}
            </View>
          ))
      )}
    </View>
  )
}

function MethodologySection({ snapshot }: { snapshot: ReportSnapshot }) {
  return (
    <View>
      <SectionTitle index={7} section="methodologie" />
      <View style={s.card}>
        <Text style={s.h3}>Origine des données</Text>
        <Text style={s.p}>
          Ce rapport a été généré le {formatDate(new Date().toISOString().slice(0, 10))} à partir des
          données enregistrées dans l’application par l’utilisateur. Les informations sont reprises
          telles quelles : aucune donnée n’a été inventée, extrapolée ou corrigée automatiquement.
        </Text>
        <Text style={s.pMuted}>
          Origines déclarées :{' '}
          {snapshot.dataOrigins.length > 0
            ? snapshot.dataOrigins.map((o) => SOURCE_LABELS[o as keyof typeof SOURCE_LABELS] ?? o).join(' ; ')
            : 'aucune information enregistrée'}
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.h3}>Éléments manquants</Text>
        {snapshot.missingFields.length === 0 ? (
          <Text style={s.pMuted}>Toutes les caractéristiques principales du véhicule sont renseignées.</Text>
        ) : (
          <Text style={s.p}>
            Les champs suivants ne sont pas renseignés et apparaissent comme tels :{' '}
            {snapshot.missingFields.join(', ')}.
          </Text>
        )}
      </View>

      {snapshot.anomalies.length > 0 && (
        <View style={s.noticeRose}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
            Anomalies et incohérences détectées ({snapshot.anomalies.length})
          </Text>
          {snapshot.anomalies.map((a) => (
            <Text key={a.id} style={{ marginBottom: 3 }}>
              · [{a.severity === 'incoherence' ? 'Incohérence' : 'Avertissement'}] {a.message}
            </Text>
          ))}
          <Text style={{ marginTop: 4, fontStyle: 'italic' }}>
            Aucune correction automatique n’a été appliquée : ces données sont signalées pour
            transparence et restent à vérifier par l’utilisateur.
          </Text>
        </View>
      )}

      {snapshot.privacyNotices.length > 0 && (
        <View style={s.notice}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Confidentialité appliquée</Text>
          {snapshot.privacyNotices.map((n, i) => (
            <Text key={i} style={{ marginBottom: 3 }}>
              · {n.message}
            </Text>
          ))}
        </View>
      )}

      <View style={s.notice}>
        <Text style={{ fontWeight: 'bold' }}>Mentions importantes — </Text>
        <Text>
          Ce document constitue un historique des opérations enregistrées par le propriétaire du
          véhicule. Il n’est ni une expertise technique, ni une certification de l’état mécanique, ni
          une garantie de l’absence de défauts. L’acheteur est invité à faire vérifier le véhicule
          par un professionnel indépendant avant tout achat. Un hash de fichier, lorsqu’il est
          fourni, ne constitue pas une preuve de véracité du contenu du document.
        </Text>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export interface SaleReportProps {
  snapshot: ReportSnapshot
  options: ReportOptions
  /** Pages de début de section (sommaire) — null si non calculées */
  tocPages?: Partial<Record<ReportSection, number | null>>
}

export const SECTION_ORDER: ReportSection[] = [
  'identification',
  'historique',
  'pannes',
  'justificatifs',
  'depenses',
  'travaux_prevoir',
  'methodologie',
]

export function sectionList(options: ReportOptions): ReportSection[] {
  return SECTION_ORDER.filter((sec) => options.sections[sec])
}

/** Contenu d'une section — utilisé par le document final ET par la mesure du sommaire. */
export function SectionContent({
  section,
  snapshot,
  options,
}: {
  section: ReportSection
  snapshot: ReportSnapshot
  options: ReportOptions
}) {
  if (section === 'identification') return <IdentificationSection snapshot={snapshot} />
  if (section === 'historique') return <HistorySection snapshot={snapshot} options={options} />
  if (section === 'pannes') return <FaultsSection snapshot={snapshot} />
  if (section === 'justificatifs') return <DocumentsSection snapshot={snapshot} options={options} />
  if (section === 'depenses') return <ExpensesSection snapshot={snapshot} options={options} />
  if (section === 'travaux_prevoir') return <UpcomingSection snapshot={snapshot} />
  return <MethodologySection snapshot={snapshot} />
}

function Cover({ snapshot, options }: { snapshot: ReportSnapshot; options: ReportOptions }) {
  const v = snapshot.vehicle
  const t = snapshot.totals
  return (
    <View>
      <Text style={s.coverBrand}>AutoCarnet · Rapport de vente</Text>
      <Text style={s.coverTitle}>Historique d’entretien{'\n'}et de maintenance du véhicule</Text>
      <View style={s.coverRule} />

      <Text style={s.coverVehicle}>
        {v.marque} {v.modele}
        {v.finition ? ` — ${v.finition}` : ''}
      </Text>
      <Text style={s.coverVehicleSub}>
        {v.annee}
        {v.motorisation ? ` · ${v.motorisation}` : ''} · {CARBURANT_LABELS[v.carburant]}
        {v.immatriculation ? ` · ${v.immatriculation}` : ''}
      </Text>

      <View style={s.kpiRow}>
        <View style={s.kpiBox}>
          <Text style={s.kpiValue}>{snapshot.counts.interventionsEffectuees}</Text>
          <Text style={s.kpiLabel}>Interventions</Text>
        </View>
        <View style={s.kpiBox}>
          <Text style={s.kpiValue}>
            {snapshot.kmRange.min != null && snapshot.kmRange.max != null
              ? `${Math.round(snapshot.kmRange.max / 1000)}k km`
              : '—'}
          </Text>
          <Text style={s.kpiLabel}>Kilométrage connu</Text>
        </View>
        <View style={s.kpiBox}>
          <Text style={s.kpiValue}>{snapshot.counts.documents}</Text>
          <Text style={s.kpiLabel}>Justificatifs</Text>
        </View>
        <View style={s.kpiBox}>
          <Text style={s.kpiValue}>{options.includeCosts ? formatEuro(t.net) : '—'}</Text>
          <Text style={s.kpiLabel}>Dépenses nettes</Text>
        </View>
      </View>

      <View style={s.kpiRow}>
        <View style={s.kpiBox}>
          <Text style={s.kpiValue}>
            {snapshot.period.from || snapshot.period.to
              ? `${snapshot.period.from ? formatDateShort(snapshot.period.from) : '…'} → ${snapshot.period.to ? formatDateShort(snapshot.period.to) : '…'}`
              : 'Historique complet'}
          </Text>
          <Text style={s.kpiLabel}>Période couverte</Text>
        </View>
      </View>

      {snapshot.anomalies.length > 0 && (
        <View style={s.noticeRose}>
          <Text>
            {snapshot.anomalies.length} anomalie(s) détectée(s) dans les données (incohérences
            kilométriques ou chronologiques, données manquantes). Le détail figure en section
            « Méthodologie et limites ». Les données n’ont pas été modifiées.
          </Text>
        </View>
      )}

      <View style={s.notice}>
        <Text style={{ fontWeight: 'bold' }}>Avertissement — </Text>
        <Text>
          Ce document n’est ni une expertise ni une certification de l’état mécanique du véhicule. Il
          reprend uniquement les informations réellement enregistrées par son propriétaire.
        </Text>
      </View>

      <View style={s.coverFooter}>
        <Text>
          Document généré le {formatDate(snapshot.generatedAt.slice(0, 10))} · Propriétaire :{' '}
          {snapshot.vehicle.ownerName} · Les mentions de confidentialité figurent en fin de document.
        </Text>
      </View>
    </View>
  )
}

function Toc({ options, tocPages }: { options: ReportOptions; tocPages?: SaleReportProps['tocPages'] }) {
  const sections = sectionList(options)
  return (
    <View>
      <Text style={s.tocTitle}>Sommaire</Text>
      <Text style={s.tocIntro}>
        Ce rapport contient les sections suivantes, générées à partir des données sélectionnées lors
        de l’export.
      </Text>
      {sections.map((sec, i) => (
        <View key={sec}>
          <View style={s.tocRow} >
            <Text style={s.tocRowText}>
              <Text style={s.tocRowNum}>{i + 1}. </Text>
              {SECTION_LABELS[sec]}
            </Text>
            <Text style={s.tocRowPage}>{tocPages?.[sec] != null ? `page ${tocPages[sec]}` : ''}</Text>
          </View>
          <View style={s.tocSep} />
        </View>
      ))}
      <View style={{ marginTop: 24 }}>
        <Text style={s.pMuted}>
          Couverture et sommaire précèdent les sections. Le numéro de page courant figure en pied de
          chaque page.
        </Text>
      </View>
    </View>
  )
}

export function SaleReportDocument({ snapshot, options, tocPages }: SaleReportProps) {
  const sections = sectionList(options)
  return (
    <Document
      title={`Rapport de vente — ${snapshot.vehicle.marque} ${snapshot.vehicle.modele}`}
      author="AutoCarnet"
      subject="Historique d'entretien du véhicule"
      creator="AutoCarnet"
      producer="AutoCarnet (@react-pdf/renderer)"
    >
      <Page size="A4" style={s.page}>
        <Cover snapshot={snapshot} options={options} />
      </Page>
      <Page size="A4" style={s.page}>
        <Toc options={options} tocPages={tocPages} />
        <View style={s.footer} fixed>
          <Text style={s.footerStrong}>
            {snapshot.vehicle.marque} {snapshot.vehicle.modele}
            {snapshot.vehicle.immatriculation ? ` · ${snapshot.vehicle.immatriculation}` : ''}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Généré le ${formatDateShort(snapshot.generatedAt.slice(0, 10))} · Page ${pageNumber}/${totalPages}`
            }
          />
        </View>
      </Page>
      {sections.map((sec) => (
        <Page key={sec} size="A4" style={s.page}>
          <SectionContent section={sec} snapshot={snapshot} options={options} />
          <View style={s.footer} fixed>
            <Text style={s.footerStrong}>
              {snapshot.vehicle.marque} {snapshot.vehicle.modele}
              {snapshot.vehicle.immatriculation ? ` · ${snapshot.vehicle.immatriculation}` : ''}
            </Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `Généré le ${formatDateShort(snapshot.generatedAt.slice(0, 10))} · Page ${pageNumber}/${totalPages}`
              }
            />
          </View>
        </Page>
      ))}
    </Document>
  )
}
