import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  getDiseaseAssessment,
  saveDiseaseQuestion,
  deleteDiseaseQuestion,
  duplicateDiseaseQuestion,
  saveDiseaseAssessmentSettings,
  setDiseaseQuestionPublish,
  setDiseaseAssessmentPublish,
  updateDiseaseQuestionSequence,
} from '../../services/diseaseAssessmentService';
import QuestionCard from '../../components/disease/QuestionCard';
import QuestionFormModal from '../../components/disease/QuestionFormModal';
import QuestionViewModal from '../../components/disease/QuestionViewModal';
import AssessmentSettingsDrawer from '../../components/disease/AssessmentSettingsDrawer';
import PatientPreviewModal from '../../components/disease/PatientPreviewModal';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import { adTokens } from '../../theme/colors';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';

/**
 * Port of AllyDocReactApp's Disease Questionnaire Builder
 * (module/Doctor/Pages/Settings/Disease/DiseaseQuestionnairePage.jsx). Web never actually links to
 * this screen from its own UI (confirmed orphaned route - no navigate()/Link anywhere points at
 * it), so this is reachable here from Settings -> Assign Disease's "Manage Questions" action
 * instead, which is an Android-only improvement over web, not a deviation from it.
 *
 * Reordering uses up/down arrows instead of web's HTML5 drag-and-drop (no drag library in this
 * project) - each move calls the same UpdateQuestionSequence endpoint with the full new id order.
 */

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];
const REQUIRED_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'required', label: 'Required' },
  { value: 'optional', label: 'Optional' },
];

function groupBySection(questions) {
  const groups = new Map();
  const loose = [];
  for (const q of questions) {
    if (!q.section) {
      loose.push(q);
      continue;
    }
    if (!groups.has(q.section)) groups.set(q.section, []);
    groups.get(q.section).push(q);
  }
  const out = [...groups.entries()].map(([section, items]) => ({ section, items }));
  if (loose.length) out.push({ section: null, items: loose });
  return out;
}

export default function DiseaseQuestionnairePage() {
  const bottomSafe = useBottomSafeSpacing();
  const navigation = useNavigation();
  const route = useRoute();
  const { diseaseId, diseaseName: diseaseNameParam } = route.params || {};

  const [disease, setDisease] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [busyQuestionId, setBusyQuestionId] = useState(null);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('questions');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRequired, setFilterRequired] = useState('all');
  const [confirmModal, setConfirmModal] = useState(null); // {kind, payload}

  useEffect(() => {
    navigation.setOptions({ title: diseaseNameParam ? `${diseaseNameParam} — Assessment` : 'Assessment' });
  }, [navigation, diseaseNameParam]);

  const loadAssessment = useCallback(async () => {
    if (!diseaseId) return;
    setLoading(true);
    setError(null);
    const res = await getDiseaseAssessment(diseaseId);
    if (res.success) {
      const data = res.data?.data ?? res.data ?? {};
      setDisease(data.disease ?? null);
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
    } else {
      setError(res.error || 'Failed to load assessment');
      setDisease(null);
      setQuestions([]);
    }
    setLoading(false);
  }, [diseaseId]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  const diseaseName = disease?.name || diseaseNameParam || `Disease #${diseaseId}`;
  const publishedCount = questions.filter((q) => q.status === 'published').length;
  const draftCount = questions.length - publishedCount;
  const allPublished = questions.length > 0 && draftCount === 0;
  const allDraft = questions.length > 0 && publishedCount === 0;
  const statusLabel = questions.length === 0 ? 'No questions' : allPublished ? 'Published' : allDraft ? 'Draft' : `${publishedCount}/${questions.length} published`;

  const filteredQuestions = useMemo(
    () =>
      questions.filter((q) => {
        const matchStatus = filterStatus === 'all' || (filterStatus === 'published' ? q.status === 'published' : q.status !== 'published');
        const matchRequired = filterRequired === 'all' || (filterRequired === 'required' ? Boolean(q.required) : !q.required);
        return matchStatus && matchRequired;
      }),
    [questions, filterStatus, filterRequired],
  );
  const groupedFiltered = useMemo(() => groupBySection(filteredQuestions), [filteredQuestions]);
  const filtersActive = filterStatus !== 'all' || filterRequired !== 'all';
  const activeFilterCount = (filterStatus !== 'all' ? 1 : 0) + (filterRequired !== 'all' ? 1 : 0);
  const clearFilters = () => {
    setFilterStatus('all');
    setFilterRequired('all');
  };

  const toggleSection = (name) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const moveQuestion = async (question, direction) => {
    // Reordering is disabled while a filter narrows the list, since the move has to operate on the
    // full ordered id list, not the filtered subset.
    const ids = questions.map((q) => q.id);
    const from = ids.indexOf(question.id);
    const to = from + direction;
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    const reordered = next.map((id) => questions.find((q) => q.id === id));
    setQuestions(reordered);
    const res = await updateDiseaseQuestionSequence(Number(diseaseId), next);
    if (!res.success) await loadAssessment();
  };

  const handleSaveQuestion = async (payload) => {
    setSavingQuestion(true);
    const res = await saveDiseaseQuestion(payload);
    setSavingQuestion(false);
    if (res.success) {
      await loadAssessment();
      setShowQuestionModal(false);
      setEditing(null);
    }
  };

  const confirmDelete = async () => {
    const deleting = confirmModal?.payload;
    if (!deleting) return;
    setBusyQuestionId(deleting.id);
    setConfirmModal(null);
    await deleteDiseaseQuestion(Number(diseaseId), deleting.id);
    setBusyQuestionId(null);
    await loadAssessment();
  };

  const confirmDuplicate = async () => {
    const duplicating = confirmModal?.payload;
    if (!duplicating) return;
    setBusyQuestionId(duplicating.id);
    setConfirmModal(null);
    await duplicateDiseaseQuestion(duplicating.id);
    setBusyQuestionId(null);
    await loadAssessment();
  };

  const handleSaveSettings = async (payload) => {
    setSavingSettings(true);
    const res = await saveDiseaseAssessmentSettings(payload);
    setSavingSettings(false);
    if (res.success) {
      await loadAssessment();
      setShowSettings(false);
    }
  };

  const confirmPublish = async () => {
    const p = confirmModal?.payload;
    setConfirmModal(null);
    if (!p) return;
    if (p.scope === 'question') {
      await setDiseaseQuestionPublish(p.question.id, p.question.status !== 'published');
    } else {
      await setDiseaseAssessmentPublish(Number(diseaseId), p.isPublished);
    }
    await loadAssessment();
  };

  const publishCopy = () => {
    const p = confirmModal?.payload;
    if (!p || confirmModal.kind !== 'publish') return { title: '', message: '', confirmText: 'Confirm' };
    if (p.scope === 'question') {
      const publishing = p.question.status !== 'published';
      return publishing
        ? { title: 'Publish Question', message: 'Patients will start seeing this question in the assessment. Publish it?', confirmText: 'Publish' }
        : { title: 'Move to Draft', message: 'Patients will stop seeing this question. Move it to draft?', confirmText: 'Move to Draft' };
    }
    return p.isPublished
      ? { title: 'Publish Draft Changes', message: `You are about to publish ${draftCount} question${draftCount === 1 ? '' : 's'} to the ${diseaseName} assessment.`, confirmText: 'Publish Changes' }
      : { title: 'Move Assessment to Draft', message: `All ${questions.length} questions will be hidden from patients. Continue?`, confirmText: 'Move All to Draft' };
  };

  let flatIndex = -1;

  return (
    <View style={styles.screen}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <Text style={styles.headerTitle} numberOfLines={2}>{diseaseName}</Text>
            <View style={styles.headerMetaRow}>
              <Text style={styles.headerMeta}>
                {questions.length} {questions.length === 1 ? 'question' : 'questions'}
              </Text>
              <View style={[styles.statusBadge, allPublished ? styles.statusSuccess : questions.length === 0 ? styles.statusNeutral : styles.statusWarning]}>
                <Text style={[styles.statusBadgeText, allPublished ? styles.statusSuccessText : questions.length === 0 ? styles.statusNeutralText : styles.statusWarningText]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.outlineBtn, publishedCount === 0 && styles.disabled]}
            onPress={() => setShowPreview(true)}
            disabled={publishedCount === 0}
          >
            <Feather name="eye" size={14} color={adTokens.textSecondary} />
            <Text style={styles.outlineBtnText}>Preview</Text>
          </Pressable>
          <Pressable style={[styles.outlineBtn, !disease && styles.disabled]} onPress={() => setShowSettings(true)} disabled={!disease}>
            <Feather name="settings" size={14} color={adTokens.textSecondary} />
            <Text style={styles.outlineBtnText}>Settings</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={() => { setEditing(null); setShowQuestionModal(true); }}>
            <Feather name="plus" size={16} color={adTokens.white} />
            <Text style={styles.primaryBtnText}>Add Question</Text>
          </Pressable>
        </View>

        {draftCount > 0 && (
          <Pressable
            style={styles.publishDraftsBtn}
            onPress={() => setConfirmModal({ kind: 'publish', payload: { scope: 'assessment', isPublished: true } })}
          >
            <Feather name="upload-cloud" size={14} color={adTokens.white} />
            <Text style={styles.publishDraftsText}>Publish Draft Changes ({draftCount})</Text>
          </Pressable>
        )}
      </View>

      {!loading && !error && (
        <View style={styles.toolbar}>
          <SegmentedTabs
            tabs={[
              { key: 'questions', label: 'Questionnaire', count: questions.length },
              { key: 'disease-info', label: 'Disease Info' },
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
            style={styles.tabBar}
          />

          {activeTab === 'questions' && questions.length > 0 && (
            <Pressable style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} onPress={() => setShowFilter(true)}>
              <Feather name="filter" size={14} color={activeFilterCount > 0 ? adTokens.primaryDark : adTokens.textSecondary} />
              <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={adTokens.primary} />
          <Text style={styles.loadingText}>Loading assessment...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Feather name="alert-circle" size={28} color={adTokens.dangerDark} />
          <Text style={styles.errorTitle}>Unable to load this assessment</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable style={styles.outlineBtn} onPress={loadAssessment}>
            <Text style={styles.outlineBtnText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={[styles.listContent, { paddingBottom: 32 + bottomSafe }]}>
          {activeTab === 'disease-info' ? (
            <MedicalInfoPanel sections={disease?.medicalInfo ?? []} />
          ) : questions.length === 0 ? (
            <View style={styles.centerFill}>
              <MaterialCommunityIcons name="help-circle-outline" size={32} color={adTokens.textMuted} />
              <Text style={styles.errorTitle}>No questions yet</Text>
              <Text style={styles.errorBody}>Build the pre-booking assessment patients will complete for {diseaseName}.</Text>
              <Pressable onPress={() => { setEditing(null); setShowQuestionModal(true); }}>
                <Text style={styles.linkText}>Add your first question</Text>
              </Pressable>
            </View>
          ) : filteredQuestions.length === 0 ? (
            <View style={styles.centerFill}>
              <Feather name="filter" size={28} color={adTokens.textMuted} />
              <Text style={styles.errorTitle}>No matching questions</Text>
              <Text style={styles.errorBody}>Nothing matches the selected filters.</Text>
              <Pressable onPress={clearFilters}>
                <Text style={styles.linkText}>Clear filters</Text>
              </Pressable>
            </View>
          ) : (
            groupedFiltered.map(({ section, items }) => {
              const key = section ?? '__none';
              const isCollapsed = collapsed.has(key);
              const secPublished = items.filter((q) => q.status === 'published').length;
              return (
                <View key={key} style={styles.section}>
                  <Pressable style={styles.sectionHead} onPress={() => toggleSection(key)}>
                    <Feather name={isCollapsed ? 'chevron-right' : 'chevron-down'} size={16} color={adTokens.textSecondary} />
                    <Text style={styles.sectionName}>{section ?? 'Ungrouped'}</Text>
                    <Text style={styles.sectionMeta}>
                      {items.length} {items.length === 1 ? 'question' : 'questions'}
                      {secPublished !== items.length ? ` · ${secPublished} published` : ''}
                    </Text>
                  </Pressable>
                  {!isCollapsed &&
                    items.map((question) => {
                      flatIndex += 1;
                      const idx = flatIndex;
                      const fullIndex = questions.findIndex((q) => q.id === question.id);
                      return (
                        <QuestionCard
                          key={question.id}
                          question={question}
                          index={idx}
                          busy={busyQuestionId === question.id}
                          canMoveUp={!filtersActive && fullIndex > 0}
                          canMoveDown={!filtersActive && fullIndex < questions.length - 1}
                          onMoveUp={() => moveQuestion(question, -1)}
                          onMoveDown={() => moveQuestion(question, 1)}
                          onEdit={(q) => { setEditing(q); setShowQuestionModal(true); }}
                          onView={setViewing}
                          onDelete={(q) => setConfirmModal({ kind: 'delete', payload: q })}
                          onDuplicate={(q) => setConfirmModal({ kind: 'duplicate', payload: q })}
                          onTogglePublish={(q) => setConfirmModal({ kind: 'publish', payload: { scope: 'question', question: q } })}
                        />
                      );
                    })}
                </View>
              );
            })
          )}

          {activeTab === 'questions' && questions.length > 0 && (
            <View style={styles.footerRow}>
              <Pressable
                style={[styles.outlineBtn, allDraft && styles.disabled]}
                disabled={allDraft}
                onPress={() => setConfirmModal({ kind: 'publish', payload: { scope: 'assessment', isPublished: false } })}
              >
                <Text style={styles.outlineBtnText}>Move all to draft</Text>
              </Pressable>
              <Pressable
                style={[styles.outlineBtnPrimary, allPublished && styles.disabled]}
                disabled={allPublished}
                onPress={() => setConfirmModal({ kind: 'publish', payload: { scope: 'assessment', isPublished: true } })}
              >
                <Text style={styles.outlineBtnPrimaryText}>Publish all</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      <QuestionFormModal
        visible={showQuestionModal}
        question={editing}
        diseaseId={diseaseId}
        sections={[...new Set(questions.map((q) => q.section).filter(Boolean))]}
        otherQuestions={questions.filter((q) => q.id !== editing?.id)}
        saving={savingQuestion}
        onSave={handleSaveQuestion}
        onClose={() => { setShowQuestionModal(false); setEditing(null); }}
      />

      <QuestionViewModal visible={Boolean(viewing)} question={viewing} onClose={() => setViewing(null)} />

      <AssessmentSettingsDrawer
        visible={showSettings && Boolean(disease)}
        disease={disease}
        saving={savingSettings}
        onSave={handleSaveSettings}
        onClose={() => setShowSettings(false)}
      />

      <PatientPreviewModal visible={showPreview} disease={disease} questions={questions} onClose={() => setShowPreview(false)} />

      <FilterSheet
        visible={showFilter}
        filterStatus={filterStatus}
        filterRequired={filterRequired}
        onChangeStatus={setFilterStatus}
        onChangeRequired={setFilterRequired}
        onClear={clearFilters}
        onClose={() => setShowFilter(false)}
      />

      <ConfirmSheet
        visible={confirmModal?.kind === 'delete'}
        title="Delete Question?"
        message="This question will be removed from this assessment."
        confirmText="Delete"
        danger
        loading={busyQuestionId === confirmModal?.payload?.id}
        onCancel={() => setConfirmModal(null)}
        onConfirm={confirmDelete}
      />
      <ConfirmSheet
        visible={confirmModal?.kind === 'duplicate'}
        title="Duplicate Question"
        message="Duplicate this question? A new copy will be created. You can edit it separately; the original stays unchanged."
        confirmText="Duplicate"
        loading={busyQuestionId === confirmModal?.payload?.id}
        onCancel={() => setConfirmModal(null)}
        onConfirm={confirmDuplicate}
      />
      <ConfirmSheet
        visible={confirmModal?.kind === 'publish'}
        title={publishCopy().title}
        message={publishCopy().message}
        confirmText={publishCopy().confirmText}
        onCancel={() => setConfirmModal(null)}
        onConfirm={confirmPublish}
      />
    </View>
  );
}

function MedicalInfoPanel({ sections }) {
  if (!sections?.length) {
    return (
      <View style={styles.centerFill}>
        <MaterialCommunityIcons name="file-document-outline" size={30} color={adTokens.textMuted} />
        <Text style={styles.errorTitle}>No medical information added</Text>
        <Text style={styles.errorBody}>
          Medical information added here will be shown to patients before they start the health questionnaire.
        </Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {sections.map((section, i) => (
        <View key={section.id ?? i} style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>{section.title || `Section ${i + 1}`}</Text>
          {section.body ? <Text style={styles.infoCardBody}>{section.body}</Text> : null}
          {Array.isArray(section.items) &&
            section.items.filter(Boolean).map((item, j) => (
              <Text key={j} style={styles.infoCardItem}>
                {'• '}{item}
              </Text>
            ))}
        </View>
      ))}
    </View>
  );
}

function FilterSheet({ visible, filterStatus, filterRequired, onChangeStatus, onChangeRequired, onClear, onClose }) {
  const bottomSafe = useBottomSafeSpacing();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Toast />
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 18 + bottomSafe }]}>
        <Text style={styles.sheetLabel}>Status</Text>
        {STATUS_FILTERS.map((opt) => (
          <Pressable key={opt.value} style={styles.radioRow} onPress={() => onChangeStatus(opt.value)}>
            <MaterialCommunityIcons
              name={filterStatus === opt.value ? 'radiobox-marked' : 'radiobox-blank'}
              size={18}
              color={filterStatus === opt.value ? adTokens.primary : adTokens.textMuted}
            />
            <Text style={styles.radioLabel}>{opt.label}</Text>
          </Pressable>
        ))}
        <Text style={[styles.sheetLabel, { marginTop: 12 }]}>Required</Text>
        {REQUIRED_FILTERS.map((opt) => (
          <Pressable key={opt.value} style={styles.radioRow} onPress={() => onChangeRequired(opt.value)}>
            <MaterialCommunityIcons
              name={filterRequired === opt.value ? 'radiobox-marked' : 'radiobox-blank'}
              size={18}
              color={filterRequired === opt.value ? adTokens.primary : adTokens.textMuted}
            />
            <Text style={styles.radioLabel}>{opt.label}</Text>
          </Pressable>
        ))}
        <View style={styles.sheetFooter}>
          <Pressable style={styles.outlineBtn} onPress={onClear}>
            <Text style={styles.outlineBtnText}>Clear filters</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={onClose}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmSheet({ visible, title, message, confirmText, danger, loading, onCancel, onConfirm }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Toast />
      <Pressable style={styles.sheetBackdrop} onPress={onCancel} />
      <View style={styles.confirmCard}>
        <Text style={styles.confirmTitle}>{title}</Text>
        <Text style={styles.confirmMessage}>{message}</Text>
        <View style={styles.sheetFooter}>
          <Pressable style={styles.outlineBtn} onPress={onCancel} disabled={loading}>
            <Text style={styles.outlineBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[danger ? styles.dangerBtn : styles.primaryBtn, loading && styles.disabled]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size={14} color={adTokens.white} /> : <Text style={danger ? styles.dangerBtnText : styles.primaryBtnText}>{confirmText}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adTokens.bgBody },
  flex1: { flex: 1 },
  headerCard: { backgroundColor: adTokens.white, padding: 16, borderBottomWidth: 1, borderBottomColor: adTokens.border, gap: 12 },
  headerRow: { flexDirection: 'row' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: adTokens.textPrimary },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  headerMeta: { fontSize: 12, color: adTokens.textSecondary },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  statusSuccess: { backgroundColor: adTokens.successTint },
  statusSuccessText: { color: adTokens.successDark },
  statusWarning: { backgroundColor: adTokens.warningTint },
  statusWarningText: { color: adTokens.warningDark },
  statusNeutral: { backgroundColor: adTokens.gray100 },
  statusNeutralText: { color: adTokens.textSecondary },
  statusBadgeText: { fontSize: 10.5, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border },
  outlineBtnText: { fontSize: 12.5, fontWeight: '600', color: adTokens.textSecondary },
  outlineBtnPrimary: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: adTokens.primary },
  outlineBtnPrimaryText: { fontSize: 12.5, fontWeight: '700', color: adTokens.primaryDark },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, backgroundColor: adTokens.primary },
  primaryBtnText: { fontSize: 12.5, fontWeight: '700', color: adTokens.white },
  dangerBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: adTokens.danger, alignItems: 'center' },
  dangerBtnText: { fontSize: 13, fontWeight: '700', color: adTokens.white },
  publishDraftsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: adTokens.warningDark },
  publishDraftsText: { fontSize: 12.5, fontWeight: '700', color: adTokens.white },
  disabled: { opacity: 0.5 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: adTokens.white, borderBottomWidth: 1, borderBottomColor: adTokens.border },
  tabBar: {},
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: adTokens.border },
  filterBtnActive: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryTint },
  filterBtnText: { fontSize: 11.5, fontWeight: '600', color: adTokens.textSecondary },
  filterBtnTextActive: { color: adTokens.primaryDark },
  centerFill: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 48, paddingHorizontal: 20 },
  loadingText: { fontSize: 12.5, color: adTokens.textSecondary },
  errorTitle: { fontSize: 14, fontWeight: '700', color: adTokens.textPrimary, textAlign: 'center' },
  errorBody: { fontSize: 12.5, color: adTokens.textSecondary, textAlign: 'center' },
  linkText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 12, paddingBottom: 32 },
  section: { gap: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  sectionName: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary },
  sectionMeta: { fontSize: 11, color: adTokens.textMuted, marginLeft: 'auto' },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  infoCard: { backgroundColor: adTokens.white, borderRadius: 12, borderWidth: 1, borderColor: adTokens.border, padding: 14, gap: 6 },
  infoCardTitle: { fontSize: 13.5, fontWeight: '700', color: adTokens.textPrimary },
  infoCardBody: { fontSize: 12.5, color: adTokens.textSecondary },
  infoCardItem: { fontSize: 12.5, color: adTokens.textSecondary },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: adTokens.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 },
  sheetLabel: { fontSize: 11.5, fontWeight: '700', color: adTokens.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  radioLabel: { fontSize: 13.5, color: adTokens.textPrimary },
  sheetFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  confirmCard: { position: 'absolute', left: 20, right: 20, top: '35%', backgroundColor: adTokens.white, borderRadius: 16, padding: 18, gap: 8 },
  confirmTitle: { fontSize: 15, fontWeight: '700', color: adTokens.textPrimary },
  confirmMessage: { fontSize: 13, color: adTokens.textSecondary },
});
