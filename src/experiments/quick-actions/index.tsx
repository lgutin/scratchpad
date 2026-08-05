import { useState, type FC, type SVGProps } from "react";
import {
  Flex,
  Text,
  Chip,
  Button,
  Tooltip,
  TextField,
  Textarea,
  Checkbox,
} from "@servicetitan/anvil2";
import { SelectField } from "@servicetitan/anvil2/beta";
import IconDragIndicator from "@servicetitan/anvil2/assets/icons/material/round/drag_indicator.svg";
import IconArrowUpward from "@servicetitan/anvil2/assets/icons/material/round/arrow_upward.svg";
import IconArrowDownward from "@servicetitan/anvil2/assets/icons/material/round/arrow_downward.svg";
import IconCallMerge from "@servicetitan/anvil2/assets/icons/material/round/call_merge.svg";
import IconEdit from "@servicetitan/anvil2/assets/icons/material/round/edit.svg";
import IconChevronDown from "@servicetitan/anvil2/assets/icons/material/round/keyboard_arrow_down.svg";
import IconChevronRight from "@servicetitan/anvil2/assets/icons/material/round/keyboard_arrow_right.svg";
import IconPreview from "@servicetitan/anvil2/assets/icons/material/round/preview.svg";
import IconAdd from "@servicetitan/anvil2/assets/icons/material/round/add.svg";

export const meta = {
  title: "Edit Form – Quick Actions",
  path: "/quick-actions",
};

type SelectOption = { id: string; label: string };

const TYPE_OPTIONS: SelectOption[] = [
  { id: "text", label: "Text Field" },
  { id: "smart", label: "Smart Field" },
  { id: "date", label: "Date Picker" },
  { id: "number", label: "Number Field" },
  { id: "time", label: "Time Picker" },
  { id: "checkbox", label: "Checkbox" },
  { id: "signature", label: "Signature" },
  { id: "dropdown", label: "Dropdown" },
];

const SMART_OPTIONS: SelectOption[] = [
  { id: "customer", label: "Customer Name" },
  { id: "address", label: "Service Address" },
  { id: "city", label: "City" },
  { id: "contact", label: "Contact Person" },
  { id: "phone", label: "Phone Number" },
  { id: "email", label: "Email" },
];

type Field = {
  id: string;
  label: string;
  type: string;
  smartField?: string;
  description?: string;
  required?: boolean;
  options?: string;
};

type Section = {
  id: string;
  title: string;
  count: number;
  expanded: boolean;
  fields: Field[];
};

type Draft = {
  label: string;
  type: SelectOption | null;
  smartField: SelectOption | null;
  description: string;
  required: boolean;
};

const optionByLabel = (list: SelectOption[], label?: string) =>
  list.find((o) => o.label === label) ?? null;

const draftFromField = (field: Field): Draft => ({
  label: field.label,
  type: optionByLabel(TYPE_OPTIONS, field.type),
  smartField: optionByLabel(SMART_OPTIONS, field.smartField),
  description: field.description ?? "",
  required: field.required ?? false,
});

const initialSections: Section[] = [
  {
    id: "general",
    title: "General Information",
    count: 8,
    expanded: true,
    fields: [
      { id: "pws", label: "PWS ID", type: "Text Field" },
      { id: "file", label: "File #", type: "Text Field" },
      {
        id: "facility",
        label: "Facility Name",
        type: "Smart Field",
        smartField: "Customer Name",
      },
      {
        id: "address",
        label: "Service Address",
        type: "Smart Field",
        smartField: "Service Address",
      },
      { id: "city", label: "City", type: "Smart Field", smartField: "City" },
      {
        id: "contact",
        label: "Contact Person",
        type: "Smart Field",
        smartField: "Contact Person",
      },
      { id: "sampleDate", label: "Sample Date", type: "Date Picker" },
      {
        id: "initialTest",
        label: "Initial Test",
        type: "Checkbox",
        options: "Passed, Failed, Opened, Not Opened",
      },
    ],
  },
  {
    id: "initial-test",
    title: "Initial Test",
    count: 12,
    expanded: false,
    fields: [
      { id: "it-1", label: "Chlorine Residual", type: "Number Field" },
      { id: "it-2", label: "pH Level", type: "Number Field" },
      { id: "it-3", label: "Turbidity", type: "Number Field" },
      { id: "it-4", label: "Sample Time", type: "Time Picker" },
    ],
  },
  {
    id: "test-kit",
    title: "Test Kit",
    count: 10,
    expanded: false,
    fields: [
      { id: "tk-1", label: "Kit Serial #", type: "Text Field" },
      { id: "tk-2", label: "Reagent Lot #", type: "Text Field" },
      { id: "tk-3", label: "Expiration Date", type: "Date Picker" },
    ],
  },
];

export default function EditFormExperiment() {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const openEdit = (field: Field) => {
    setEditingId(field.id);
    setDraft(draftFromField(field));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const updateDraft = (patch: Partial<Draft>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const commitEdit = () => {
    if (!editingId || !draft) return;
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        fields: section.fields.map((f) =>
          f.id === editingId
            ? {
                ...f,
                label: draft.label,
                type: draft.type?.label ?? f.type,
                smartField:
                  draft.type?.id === "smart"
                    ? draft.smartField?.label
                    : undefined,
                description: draft.description || undefined,
                required: draft.required,
              }
            : f
        ),
      }))
    );
    setLastAction(`Updated “${draft.label}”`);
    cancelEdit();
  };

  const removeField = () => {
    if (!editingId) return;
    let removed: Field | undefined;
    setSections((prev) =>
      prev.map((section) => {
        const found = section.fields.find((f) => f.id === editingId);
        if (found) removed = found;
        return {
          ...section,
          fields: section.fields.filter((f) => f.id !== editingId),
        };
      })
    );
    if (removed) setLastAction(`Removed “${removed.label}”`);
    cancelEdit();
  };

  const toggleSection = (sectionId: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, expanded: !s.expanded } : s
      )
    );

  const moveField = (sectionId: string, index: number, dir: -1 | 1) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        const target = index + dir;
        if (target < 0 || target >= section.fields.length) return section;
        const fields = [...section.fields];
        [fields[index], fields[target]] = [fields[target], fields[index]];
        return { ...section, fields };
      })
    );
    const field = sections.find((s) => s.id === sectionId)?.fields[index];
    if (field) {
      setLastAction(`Moved “${field.label}” ${dir === -1 ? "up" : "down"}`);
    }
  };

  return (
    <Flex
      justifyContent="center"
      style={{
        padding: "24px",
        background: "var(--background-color-secondary, #eef0f2)",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <style>{EDIT_FORM_STYLES}</style>

      <div className="ef-panel">
        <div className="ef-header">
          <div className="ef-header-titles">
            <Text variant="body" size="medium" style={{ fontWeight: 700 }}>
              Edit Form
            </Text>
            <Text variant="body" size="small" subdued>
              Adjust field names, types, and order as desired.
            </Text>
          </div>
          <Button
            appearance="secondary"
            icon={{ before: IconPreview }}
            onClick={() => setLastAction("Opened Preview")}
          >
            Preview
          </Button>
        </div>

        {sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            editingId={editingId}
            draft={draft}
            onToggle={() => toggleSection(section.id)}
            onMoveField={(index, dir) => moveField(section.id, index, dir)}
            onOpenEdit={openEdit}
            onUpdateDraft={updateDraft}
            onCommit={commitEdit}
            onCancel={cancelEdit}
            onRemove={removeField}
            onMerge={(label) => setLastAction(`Merge “${label}”`)}
          />
        ))}

        <div className="ef-footer">
          <Button
            appearance="ghost"
            icon={{ before: IconAdd }}
            onClick={() => setLastAction("Add New Section")}
          >
            Add New Section
          </Button>
        </div>

        {lastAction && (
          <div className="ef-status">
            <Text variant="body" size="small" subdued>
              Last action: {lastAction}
            </Text>
          </div>
        )}
      </div>
    </Flex>
  );
}

type SectionBlockProps = {
  section: Section;
  editingId: string | null;
  draft: Draft | null;
  onToggle: () => void;
  onMoveField: (index: number, dir: -1 | 1) => void;
  onOpenEdit: (field: Field) => void;
  onUpdateDraft: (patch: Partial<Draft>) => void;
  onCommit: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onMerge: (label: string) => void;
};

function SectionBlock({
  section,
  editingId,
  draft,
  onToggle,
  onMoveField,
  onOpenEdit,
  onUpdateDraft,
  onCommit,
  onCancel,
  onRemove,
  onMerge,
}: SectionBlockProps) {
  const { title, count, expanded, fields } = section;

  return (
    <div className="ef-section">
      <div className="ef-section-header">
        <Button
          appearance="ghost"
          size="small"
          icon={IconDragIndicator}
          aria-label={`Reorder ${title} section`}
          className="ef-drag"
        />
        <div className="ef-section-title-group">
          <div className="ef-section-title-left">
            <Button
              appearance="ghost"
              size="small"
              icon={expanded ? IconChevronDown : IconChevronRight}
              aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
              aria-expanded={expanded}
              onClick={onToggle}
            />
            <Text variant="body" size="medium" style={{ fontWeight: 700 }}>
              {title}
            </Text>
          </div>
          <Chip label={String(count)} size="small" />
        </div>
      </div>

      {expanded && (
        <div className="ef-dropzone">
          {fields.map((field, index) => (
            <FieldCard
              key={field.id}
              field={field}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              isEditing={editingId === field.id}
              draft={editingId === field.id ? draft : null}
              onOpenEdit={() => onOpenEdit(field)}
              onUpdateDraft={onUpdateDraft}
              onCommit={onCommit}
              onCancel={onCancel}
              onRemove={onRemove}
              onMoveUp={() => onMoveField(index, -1)}
              onMoveDown={() => onMoveField(index, 1)}
              onMerge={() => onMerge(field.label)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type FieldCardProps = {
  field: Field;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  draft: Draft | null;
  onOpenEdit: () => void;
  onUpdateDraft: (patch: Partial<Draft>) => void;
  onCommit: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMerge: () => void;
};

function FieldCard({
  field,
  isFirst,
  isLast,
  isEditing,
  draft,
  onOpenEdit,
  onUpdateDraft,
  onCommit,
  onCancel,
  onRemove,
  onMoveUp,
  onMoveDown,
  onMerge,
}: FieldCardProps) {
  if (isEditing && draft) {
    return (
      <div className="qa-row">
        <div className="ef-field-card ef-field-card--editing">
          <Button
            appearance="ghost"
            size="small"
            icon={IconDragIndicator}
            aria-label={`Reorder ${field.label}`}
            className="ef-drag"
            disabled
          />
          <div className="ef-edit-form">
            <TextField
              label="Field Name"
              value={draft.label}
              onChange={(e) => onUpdateDraft({ label: e.target.value })}
            />
            <SelectField
              label="Type"
              disableSearch
              displayMenuAs="popover"
              value={draft.type}
              onSelectedOptionChange={(option) =>
                onUpdateDraft({
                  type: option as SelectOption | null,
                  ...(option?.id !== "smart" ? { smartField: null } : {}),
                })
              }
              loadOptions={() => TYPE_OPTIONS}
            />
            {draft.type?.id === "smart" && (
              <SelectField
                label="Smart Field"
                disableSearch
                displayMenuAs="popover"
                value={draft.smartField}
                onSelectedOptionChange={(option) =>
                  onUpdateDraft({ smartField: option as SelectOption | null })
                }
                loadOptions={() => SMART_OPTIONS}
              />
            )}
            <Textarea
              label="Description"
              value={draft.description}
              onChange={(e) => onUpdateDraft({ description: e.target.value })}
            />
            <Checkbox
              label="Required"
              checked={draft.required}
              onChange={(e) =>
                onUpdateDraft({ required: e?.target?.checked ?? false })
              }
            />
            <div className="ef-edit-actions">
              <Button appearance="primary" size="small" onClick={onCommit}>
                Update
              </Button>
              <Button appearance="ghost" size="small" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                appearance="danger-secondary"
                size="small"
                onClick={onRemove}
                className="ef-remove"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qa-row">
      <div
        className="ef-field-card ef-field-card--clickable"
        onClick={onOpenEdit}
      >
        <Button
          appearance="ghost"
          size="small"
          icon={IconDragIndicator}
          aria-label={`Reorder ${field.label}`}
          className="ef-drag"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="ef-field-text">
          <Text variant="body" size="medium" style={{ fontWeight: 700 }}>
            {field.label}
          </Text>
          <Text variant="body" size="small" subdued>
            Field Type: {field.type}
          </Text>
          {field.options && (
            <Text variant="body" size="small" subdued>
              Checkbox Options: {field.options}
            </Text>
          )}
        </div>
      </div>

      {/* Quick actions — revealed on hover / focus */}
      <div className="qa-toolbar">
        <ActionButton
          icon={IconArrowUpward}
          label="Move up"
          disabled={isFirst}
          onClick={onMoveUp}
        />
        <ActionButton
          icon={IconArrowDownward}
          label="Move down"
          disabled={isLast}
          onClick={onMoveDown}
        />
        <ActionButton icon={IconCallMerge} label="Merge" onClick={onMerge} />
        <ActionButton icon={IconEdit} label="Edit" onClick={onOpenEdit} />
      </div>
    </div>
  );
}

type ActionButtonProps = {
  icon: FC<SVGProps<SVGSVGElement>>;
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

function ActionButton({ icon, label, disabled, onClick }: ActionButtonProps) {
  return (
    <Tooltip placement="top" openOnHover>
      <Tooltip.Trigger>
        <Button
          appearance="ghost"
          size="small"
          icon={icon}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        />
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

const EDIT_FORM_STYLES = `
.ef-panel {
  width: 100%;
  max-width: 600px;
  background: var(--a2-background-color-default, #ffffff);
  border: 1px solid var(--a2-border-color-subdued, #e6e6e6);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px 0 rgba(20, 20, 20, 0.08);
  align-self: flex-start;
}
.ef-header {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  padding: 16px;
}
.ef-header-titles {
  flex: 1 0 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ef-section-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 16px 16px 16px 12px;
  border-top: 1px solid var(--a2-border-color-subdued, #e6e6e6);
  background: var(--a2-background-color-default, #ffffff);
}
.ef-section-title-group {
  flex: 1 0 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ef-section-title-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.ef-dropzone {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--a2-border-color-subdued, #e6e6e6);
  background: var(--a2-background-color-strong, #f6f7f8);
}
.ef-drag {
  cursor: grab;
  flex-shrink: 0;
}
.ef-field-card {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
  padding: 16px 16px 16px 12px;
  background: var(--a2-background-color-default, #ffffff);
  border: 1px solid var(--a2-border-color-subdued, #e6e6e6);
  border-radius: 12px;
  transition: background-color 0.12s ease;
}
.ef-field-card--clickable {
  cursor: pointer;
}
.ef-field-card--editing {
  cursor: default;
  border-color: var(--a2-border-color-primary, #1f6cf9);
  box-shadow: 0 0 0 1px var(--a2-border-color-primary, #1f6cf9);
}
.ef-field-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 4px;
}
.ef-edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1 0 0;
  min-width: 0;
  padding-top: 2px;
}
.ef-edit-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.ef-edit-actions .ef-remove {
  margin-left: auto;
}
.ef-footer {
  padding: 16px;
  border-top: 1px solid var(--a2-border-color-subdued, #e6e6e6);
}
.ef-status {
  padding: 0 16px 16px;
}

/* Quick actions card (hover-revealed toolbar) */
.qa-row {
  position: relative;
}
.qa-row:hover .ef-field-card--clickable,
.qa-row:focus-within .ef-field-card--clickable {
  background: var(--a2-background-color-strong, #f9f9f9);
}
.qa-toolbar {
  position: absolute;
  top: -8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 2px;
  background: var(--a2-background-color-default, #ffffff);
  border: 1px solid var(--a2-border-color-subdued, #e6e6e6);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px 0 rgba(20, 20, 20, 0.08);
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 0.12s ease, transform 0.12s ease;
  pointer-events: none;
}
.qa-row:hover .qa-toolbar,
.qa-row:focus-within .qa-toolbar {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
`;
