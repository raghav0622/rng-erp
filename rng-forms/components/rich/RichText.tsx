'use client';

import { Stack, Text, Tooltip } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { RichTextInputItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export default function RichTextInputField<TValues extends FieldValues>(
  props: RichTextInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, disabled, error } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Superscript,
      Subscript,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
    ],
    content: field.value || '<p></p>',
    onUpdate: ({ editor }) => {
      field.onChange(editor.getHTML());
    },
    editable: !disabled,
  });

  return (
    <Stack gap="sm">
      {label && (
        <Text size="sm" fw={600}>
          {label}
        </Text>
      )}

      <RichTextEditor editor={editor}>
        <RichTextEditor.Toolbar sticky stickyOffset={60}>
          <RichTextEditor.ControlsGroup>
            <Tooltip label="Bold" withArrow>
              <RichTextEditor.Bold />
            </Tooltip>
            <Tooltip label="Italic" withArrow>
              <RichTextEditor.Italic />
            </Tooltip>
            <Tooltip label="Underline" withArrow>
              <RichTextEditor.Underline />
            </Tooltip>
            <Tooltip label="Strikethrough" withArrow>
              <RichTextEditor.Strikethrough />
            </Tooltip>
            <Tooltip label="Clear formatting" withArrow>
              <RichTextEditor.ClearFormatting />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Heading 1" withArrow>
              <RichTextEditor.H1 />
            </Tooltip>
            <Tooltip label="Heading 2" withArrow>
              <RichTextEditor.H2 />
            </Tooltip>
            <Tooltip label="Heading 3" withArrow>
              <RichTextEditor.H3 />
            </Tooltip>
            <Tooltip label="Heading 4" withArrow>
              <RichTextEditor.H4 />
            </Tooltip>
            <Tooltip label="Heading 5" withArrow>
              <RichTextEditor.H5 />
            </Tooltip>
            <Tooltip label="Heading 6" withArrow>
              <RichTextEditor.H6 />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Block quote" withArrow>
              <RichTextEditor.Blockquote />
            </Tooltip>
            <Tooltip label="Horizontal rule" withArrow>
              <RichTextEditor.Hr />
            </Tooltip>
            <Tooltip label="Bulleted list" withArrow>
              <RichTextEditor.BulletList />
            </Tooltip>
            <Tooltip label="Numbered list" withArrow>
              <RichTextEditor.OrderedList />
            </Tooltip>
            <Tooltip label="Subscript" withArrow>
              <RichTextEditor.Subscript />
            </Tooltip>
            <Tooltip label="Superscript" withArrow>
              <RichTextEditor.Superscript />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Insert link" withArrow>
              <RichTextEditor.Link />
            </Tooltip>
            <Tooltip label="Unlink" withArrow>
              <RichTextEditor.Unlink />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Align left" withArrow>
              <RichTextEditor.AlignLeft />
            </Tooltip>
            <Tooltip label="Align center" withArrow>
              <RichTextEditor.AlignCenter />
            </Tooltip>
            <Tooltip label="Justify" withArrow>
              <RichTextEditor.AlignJustify />
            </Tooltip>
            <Tooltip label="Align right" withArrow>
              <RichTextEditor.AlignRight />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Undo" withArrow>
              <RichTextEditor.Undo />
            </Tooltip>
            <Tooltip label="Redo" withArrow>
              <RichTextEditor.Redo />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Inline code" withArrow>
              <RichTextEditor.Code />
            </Tooltip>
            <Tooltip label="Code block" withArrow>
              <RichTextEditor.CodeBlock />
            </Tooltip>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ColorPicker
            colors={[
              '#25262b',
              '#868e96',
              '#fa5252',
              '#e64980',
              '#be4bdb',
              '#7950f2',
              '#4c6ef5',
              '#228be6',
              '#15aabf',
              '#12b886',
              '#40c057',
              '#82c91e',
              '#fab005',
              '#fd7e14',
            ]}
          />

          <RichTextEditor.ControlsGroup>
            <Tooltip label="Insert table" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}
                aria-label="Insert table"
                title="Insert table"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Add column before" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().addColumnBefore().run()}
                aria-label="Add column before"
                title="Add column before"
              >
                ⬅️+
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Add column after" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
                aria-label="Add column after"
                title="Add column after"
              >
                +➡️
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Delete column" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().deleteColumn().run()}
                aria-label="Delete column"
                title="Delete column"
              >
                ❌📋
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Add row before" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().addRowBefore().run()}
                aria-label="Add row before"
                title="Add row before"
              >
                ⬆️+
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Add row after" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().addRowAfter().run()}
                aria-label="Add row after"
                title="Add row after"
              >
                +⬇️
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Delete row" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().deleteRow().run()}
                aria-label="Delete row"
                title="Delete row"
              >
                ❌📄
              </RichTextEditor.Control>
            </Tooltip>
            <Tooltip label="Delete table" withArrow>
              <RichTextEditor.Control
                onClick={() => editor?.chain().focus().deleteTable().run()}
                aria-label="Delete table"
                title="Delete table"
              >
                ❌📊
              </RichTextEditor.Control>
            </Tooltip>
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content
          className="rte-visible-table-borders"
          style={{
            minHeight: 200,
            borderColor: mergedError ? 'var(--mantine-color-red-6)' : undefined,
            borderWidth: mergedError ? 2 : undefined,
            borderStyle: 'solid',
          }}
        />
        <style>{`
          /* Visible, distinct table borders for RTE content */
          .rte-visible-table-borders table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000 !important;
            margin: 8px 0;
          }
          .rte-visible-table-borders th,
          .rte-visible-table-borders td {
            border: 1px solid #000 !important;
            padding: 8px 10px !important;
            vertical-align: top !important;
          }
          .rte-visible-table-borders th {
            background: #f5f5f5 !important;
            font-weight: 600 !important;
          }
          /* Make table outlines a little stronger for contrast */
          .rte-visible-table-borders table[rte-outline],
          .rte-visible-table-borders table:where(*) {
            outline: none;
          }
        `}</style>
      </RichTextEditor>

      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      {mergedError && (
        <Text size="xs" c="red">
          {mergedError}
        </Text>
      )}
    </Stack>
  );
}
