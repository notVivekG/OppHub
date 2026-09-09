import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import { JsonResume } from '@/types';

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    lineHeight: 1.35,
    color: '#111827',
  },
  header: {
    marginBottom: 12,
    textAlign: 'center',
  },
  name: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    marginBottom: 3,
    color: '#0f172a',
  },
  title: {
    fontSize: 10.5,
    fontFamily: 'Helvetica',
    color: '#475569',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 8.5,
    color: '#475569',
  },
  contactItem: {
    marginRight: 6,
  },
  section: {
    marginTop: 10,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginBottom: 6,
  },
  itemBlock: {
    marginBottom: 7,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  itemSubtitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Oblique',
    color: '#334155',
  },
  itemDate: {
    fontSize: 8.5,
    color: '#64748b',
    fontFamily: 'Helvetica',
  },
  summaryText: {
    fontSize: 9,
    color: '#334155',
    marginBottom: 3,
  },
  bulletList: {
    marginTop: 2,
    paddingLeft: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
  },
  bulletDot: {
    width: 8,
    fontSize: 9,
    color: '#475569',
  },
  bulletContent: {
    flex: 1,
    fontSize: 8.8,
    color: '#1e293b',
  },
  skillCategory: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 8.8,
  },
  skillName: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    width: 110,
  },
  skillKeywords: {
    flex: 1,
    color: '#334155',
  },
});

interface ResumePdfDocumentProps {
  resume: JsonResume;
}

export function ResumePdfDocument({ resume }: ResumePdfDocumentProps) {
  const { basics, work = [], education = [], skills = [], projects = [] } = resume || {};

  return (
    <Document title={`${basics?.name || 'Resume'} - OppHub`} author={basics?.name || 'Candidate'}>
      <Page size="A4" style={styles.page}>
        {/* Contact Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{basics?.name || 'Candidate Name'}</Text>
          {basics?.label && <Text style={styles.title}>{basics.label}</Text>}
          <View style={styles.contactRow}>
            {basics?.email && <Text style={styles.contactItem}>{basics.email}</Text>}
            {basics?.phone && <Text style={styles.contactItem}>•  {basics.phone}</Text>}
            {basics?.location?.city && (
              <Text style={styles.contactItem}>
                •  {basics.location.city}{basics.location.region ? `, ${basics.location.region}` : ''}
              </Text>
            )}
            {basics?.url && <Text style={styles.contactItem}>•  {basics.url}</Text>}
          </View>
        </View>

        {/* Summary (if present) */}
        {basics?.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Professional Summary</Text>
            <Text style={styles.summaryText}>{basics.summary}</Text>
          </View>
        )}

        {/* Education */}
        {education && education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Education</Text>
            {education.map((edu, idx) => (
              <View key={idx} style={styles.itemBlock}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{edu.institution || 'University'}</Text>
                  <Text style={styles.itemDate}>
                    {[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}
                  </Text>
                </View>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemSubtitle}>
                    {[edu.studyType, edu.area].filter(Boolean).join(' in ')}
                    {edu.score ? ` (GPA: ${edu.score})` : ''}
                  </Text>
                </View>
                {edu.courses && edu.courses.length > 0 && (
                  <Text style={[styles.summaryText, { fontSize: 8.5, color: '#475569', marginTop: 1 }]}>
                    Relevant Coursework: {edu.courses.join(', ')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Experience */}
        {work && work.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Experience</Text>
            {work.map((job, idx) => (
              <View key={idx} style={styles.itemBlock}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>
                    {job.position || 'Software Engineer'}{' '}
                    <Text style={{ fontFamily: 'Helvetica', color: '#475569' }}>| {job.name}</Text>
                  </Text>
                  <Text style={styles.itemDate}>
                    {[job.startDate, job.endDate || 'Present'].filter(Boolean).join(' – ')}
                  </Text>
                </View>
                {job.summary && <Text style={styles.summaryText}>{job.summary}</Text>}
                {job.highlights && job.highlights.length > 0 && (
                  <View style={styles.bulletList}>
                    {job.highlights.map((bullet, bIdx) => (
                      <View key={bIdx} style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletContent}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {projects && projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Projects</Text>
            {projects.map((proj, idx) => (
              <View key={idx} style={styles.itemBlock}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>
                    {proj.name}
                    {proj.keywords && proj.keywords.length > 0 && (
                      <Text style={{ fontFamily: 'Helvetica-Oblique', fontSize: 8.5, color: '#475569' }}>
                        {' '}| {proj.keywords.join(', ')}
                      </Text>
                    )}
                  </Text>
                  {proj.startDate && (
                    <Text style={styles.itemDate}>
                      {[proj.startDate, proj.endDate].filter(Boolean).join(' – ')}
                    </Text>
                  )}
                </View>
                {proj.description && <Text style={styles.summaryText}>{proj.description}</Text>}
                {proj.highlights && proj.highlights.length > 0 && (
                  <View style={styles.bulletList}>
                    {proj.highlights.map((bullet, bIdx) => (
                      <View key={bIdx} style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletContent}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Technical Skills */}
        {skills && skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Technical Skills</Text>
            {skills.map((skill, idx) => (
              <View key={idx} style={styles.skillCategory}>
                <Text style={styles.skillName}>{skill.name || 'Skills'}:</Text>
                <Text style={styles.skillKeywords}>
                  {(skill.keywords || []).join(', ')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
