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
  family: 'Noto Sans',
  fonts: [
    { src: '/fonts/NotoSans-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSans-Bold.ttf', fontWeight: 700 }
  ]
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontFamily: 'Noto Sans',
    fontSize: 10,
    color: '#111827',
    lineHeight: 1.6
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    marginBottom: 24
  },
  brand: { fontSize: 22, fontWeight: 700, color: '#2563eb' },
  muted: { color: '#647084', fontSize: 9 },
  title: { fontSize: 21, fontWeight: 700, marginTop: 6, marginBottom: 12 },
  status: { color: '#2563eb', marginBottom: 24 },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f6f8fb',
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
    borderTopColor: '#e6eaf0'
  },
  author: { fontWeight: 700, marginBottom: 3 },
  footerLeft: {
    position: 'absolute',
    height: 16,
    bottom: 24,
    left: 40,
    color: '#647084',
    fontSize: 8
  }
})

export function IncidentPdf({
  incident,
  comments
}: {
  incident: Incident
  comments: IncidentComment[]
}) {
  let assignedEmail = 'Unassigned'
  if (incident.assignedToEmail) {
    assignedEmail = incident.assignedToEmail
  }
  return (
    <Document
      title={'INC-' + incident.id + ' - ' + incident.title}
      author="Vigil"
      language="en"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Vigil.</Text>
          <Text style={styles.muted}>Incident report</Text>
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
            <Text style={styles.muted}>Assigned to</Text>
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
          Vigil · INC-{incident.id}
        </Text>
      </Page>
    </Document>
  )
}
