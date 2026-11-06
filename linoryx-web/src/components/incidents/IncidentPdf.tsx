import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View
} from '@react-pdf/renderer'
import type { Incident, IncidentComment } from '../../models/incidents'
import {
  categoryLabels,
  formatDate,
  severityLabels,
  statusLabels
} from '../../services/dashboardData'

Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Inter-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/Inter-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 700 }
  ]
})

function createPdfStyles() {
  // Export the same resolved light-theme colors that the workspace uses.
  const tokens = getComputedStyle(document.documentElement)
  const color = (name: string) => tokens.getPropertyValue(name).trim()
  return StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontFamily: 'Inter',
    fontSize: 10,
    color: color('--color-text'),
    lineHeight: 1.6
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: color('--brand-terracotta'),
    marginBottom: 24
  },
  brand: { fontSize: 22, fontWeight: 700, color: color('--color-text') },
  muted: { color: color('--color-text-muted'), fontSize: 9 },
  title: { fontSize: 21, fontWeight: 700, marginTop: 6, marginBottom: 12 },
  status: { color: color('--color-info'), marginBottom: 24 },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: color('--color-background'),
    padding: 16,
    marginBottom: 24
  },
  fact: { width: '50%', paddingRight: 12, marginBottom: 10 },
  heading: { fontSize: 12, fontWeight: 700, marginBottom: 10, marginTop: 12 },
  body: { marginBottom: 16 },
  comment: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: color('--color-border')
  },
  author: { fontWeight: 700, marginBottom: 3 },
  footerLeft: {
    position: 'absolute',
    height: 16,
    bottom: 24,
    left: 40,
    color: color('--color-text-muted'),
    fontSize: 8
  }
  })
}

export function IncidentPdf({
  incident,
  comments
}: {
  incident: Incident
  comments: IncidentComment[]
}) {
  const styles = createPdfStyles()
  let assignedEmail = 'Per customer report'
  if (incident.assignedToEmail) {
    assignedEmail = incident.assignedToEmail
  }
  return (
    <Document
      title={'INC-' + incident.id + ' - ' + incident.title}
      author="Linoryx"
      language="en"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Linoryx</Text>
          <View>
            <Text style={styles.muted}>Telecom Operations Platform</Text>
            <Text style={styles.muted}>Incident report</Text>
          </View>
        </View>
        <Text style={styles.muted}>
          INC-{incident.id} · {categoryLabels[incident.category]}
        </Text>
        <Text style={styles.title}>{incident.title}</Text>
        <Text style={styles.status}>
          {statusLabels[incident.status]} · {severityLabels[incident.severity]}{' '}
          priority
        </Text>
        <View style={styles.facts}>
          <View style={styles.fact}>
            <Text style={styles.muted}>Reported by</Text>
            <Text>{incident.createdByEmail}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.muted}>Historical technician / assignment</Text>
            <Text>{assignedEmail}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.muted}>Reported</Text>
            <Text>
              {formatDate(incident.createdAt, {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.muted}>Last updated</Text>
            <Text>
              {formatDate(incident.updatedAt, {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </Text>
          </View>
          {incident.resolvedAt && (
            <View style={styles.fact}>
              <Text style={styles.muted}>Resolved</Text>
              <Text>
                {formatDate(incident.resolvedAt, {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.heading} minPresenceAhead={50}>
          Description
        </Text>
        <Text style={styles.body}>{incident.description}</Text>
        <Text style={styles.heading} minPresenceAhead={70}>
          Comments ({comments.length})
        </Text>
        {comments.length === 0 && (
          <Text style={styles.muted}>No comments.</Text>
        )}
        {comments.map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <View wrap={false}>
              <Text style={styles.author}>
                {comment.authorFirstName} {comment.authorLastName}
              </Text>
              <Text style={styles.muted}>
                {formatDate(comment.createdAt, {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </Text>
            </View>
            <Text>{comment.content}</Text>
          </View>
        ))}
        <Text fixed style={styles.footerLeft}>
          Linoryx · INC-{incident.id}
        </Text>
      </Page>
    </Document>
  )
}
