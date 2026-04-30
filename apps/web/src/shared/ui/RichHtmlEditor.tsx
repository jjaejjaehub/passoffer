'use client';

import {
  Box,
  Button,
  Flex,
  Input,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eye,
  ImageIcon,
  Indent,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  MoreHorizontal,
  Outdent,
  Redo2,
  Search,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Upload,
  Video,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface RichHtmlEditorProps {
  value: string;
  onChange: (nextHtml: string) => void;
  isDisabled?: boolean;
  minHeight?: string;
}

const MAX_LOCAL_IMAGE_BYTES = 1_024 * 1_024;
const MAX_TEXT_BYTES = 1_024 * 1_024;
const MAX_IMAGE_TOTAL_BYTES = 40 * 1_024 * 1_024;

function normalizeHtml(html: string): string {
  if (html === '<p></p>') return '';
  return html;
}

function formatSize(bytes: number): string {
  const kb = Math.round(bytes / 1024);
  return `${kb}KB`;
}

function calcTextSize(html: string): number {
  return new Blob([html]).size;
}

function calcImageSize(html: string): number {
  let total = 0;
  for (const match of html.matchAll(/data:image\/[^;]+;base64,([^"' ]+)/g)) {
    total += Math.round((match[1].length * 3) / 4);
  }
  return total;
}

function ToolbarBtn({
  onClick,
  disabled,
  active,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '4px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? '#e5e7eb' : 'transparent',
        color: active ? '#111' : '#4b5563',
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
        padding: 0,
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = active ? '#e5e7eb' : 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function ToolbarDivider(): React.JSX.Element {
  return (
    <Box w="1px" h={5} bg="gray.200" mx={0.5} flexShrink={0} />
  );
}

export function RichHtmlEditor({
  value,
  onChange,
  isDisabled = false,
  minHeight = '300px',
}: RichHtmlEditorProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isHtmlMode, setIsHtmlMode] = useState<boolean>(false);

  const extensions = useMemo(
    () => [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: true, autolink: true, defaultProtocol: 'https' }),
      Image.configure({ allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: value,
    editable: !isDisabled,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(normalizeHtml(ed.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = normalizeHtml(editor.getHTML());
    if (current === value) return;
    editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!isDisabled);
  }, [editor, isDisabled]);

  const handleOpenFilePicker = (): void => {
    if (isDisabled) return;
    fileInputRef.current?.click();
  };

  const handleUploadLocalImage = (file: File | null): void => {
    if (!editor || !file) return;
    setUploadError('');
    if (!file.type.startsWith('image/')) {
      setUploadError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MAX_LOCAL_IMAGE_BYTES) {
      setUploadError('이미지는 1MB 이하로 업로드해 주세요.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      editor.chain().focus().setImage({ src: reader.result }).run();
    };
    reader.onerror = () => setUploadError('이미지 업로드 중 오류가 발생했습니다.');
    reader.readAsDataURL(file);
  };

  const handleInsertImageByUrl = (): void => {
    if (!editor || isDisabled) return;
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setUploadError('http/https URL만 사용할 수 있습니다.');
        return;
      }
      setUploadError('');
      editor.chain().focus().setImage({ src: trimmed }).run();
      setImageUrlInput('');
      setShowUrlInput(false);
    } catch {
      setUploadError('올바른 이미지 URL을 입력해 주세요.');
    }
  };

  const handlePreview = (): void => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:24px;max-width:860px;margin:0 auto}img{max-width:100%;height:auto}</style></head><body>${value}</body></html>`);
    win.document.close();
  };

  const textSize = calcTextSize(value);
  const imageSize = calcImageSize(value);
  const textPct = Math.min(100, Math.round((textSize / MAX_TEXT_BYTES) * 100));
  const imagePct = Math.min(100, Math.round((imageSize / MAX_IMAGE_TOTAL_BYTES) * 100));

  return (
    <Stack gap={0}>
      {/* ── 상단 액션바 ── */}
      <Flex
        borderWidth="1px"
        borderBottomWidth="0"
        borderColor="gray.200"
        borderTopRadius="md"
        px={3}
        py={2}
        justify="space-between"
        align="center"
        bg="gray.50"
        gap={2}
        wrap="wrap"
      >
        <Flex gap={2}>
          <Button
            size="sm"
            variant="outline"
            bg="white"
            onClick={handleOpenFilePicker}
            disabled={isDisabled}
          >
            이미지 업로드 (내 파일)
          </Button>
          <Button
            size="sm"
            variant="outline"
            bg="white"
            onClick={() => setShowUrlInput((p) => !p)}
            disabled={isDisabled}
          >
            이미지 업로드 (외부 URL)
          </Button>
        </Flex>

        <Flex gap={2} align="center">
          <Button
            size="sm"
            variant="outline"
            bg="white"
            disabled
          >
            템플릿 불러오기
          </Button>
          <Button
            size="sm"
            variant="outline"
            bg="white"
            onClick={handlePreview}
            disabled={isDisabled}
          >
            상품상세 미리보기
          </Button>
        </Flex>
      </Flex>

      {/* ── 외부 URL 입력창 ── */}
      {showUrlInput && (
        <Flex
          borderWidth="1px"
          borderBottomWidth="0"
          borderColor="gray.200"
          px={3}
          py={2}
          gap={2}
          align="center"
          bg="gray.50"
        >
          <Input
            size="sm"
            flex="1"
            maxW="400px"
            placeholder="https://example.com/image.jpg"
            value={imageUrlInput}
            disabled={isDisabled}
            onChange={(e) => setImageUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleInsertImageByUrl(); }}
          />
          <Button size="sm" onClick={handleInsertImageByUrl} disabled={isDisabled}>
            삽입
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowUrlInput(false); setImageUrlInput(''); }}>
            취소
          </Button>
        </Flex>
      )}

      {/* ── 툴바 ── */}
      <Flex
        borderWidth="1px"
        borderBottomWidth="0"
        borderColor="gray.200"
        px={3}
        py={1.5}
        gap={0.5}
        align="center"
        bg="white"
        wrap="wrap"
      >
        <ToolbarBtn title="실행 취소" onClick={() => editor?.chain().focus().undo().run()} disabled={isDisabled}>
          <Undo2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="다시 실행" onClick={() => editor?.chain().focus().redo().run()} disabled={isDisabled}>
          <Redo2 size={14} />
        </ToolbarBtn>

        <ToolbarDivider />

        <ToolbarBtn title="이미지 업로드" onClick={handleOpenFilePicker} disabled={isDisabled}>
          <Upload size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="이미지 삽입" onClick={() => setShowUrlInput((p) => !p)} disabled={isDisabled}>
          <ImageIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="링크 삽입" onClick={() => {
          const url = window.prompt('URL 입력');
          if (url) editor?.chain().focus().setLink({ href: url }).run();
        }} disabled={isDisabled}>
          <LinkIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="HTML 보기" active={isHtmlMode} onClick={() => setIsHtmlMode((p) => !p)} disabled={isDisabled}>
          <Code size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="미리보기" onClick={handlePreview} disabled={isDisabled}>
          <Eye size={14} />
        </ToolbarBtn>

        <ToolbarDivider />

        <ToolbarBtn
          title="굵게"
          active={editor?.isActive('bold')}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={isDisabled}
        >
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="기울임"
          active={editor?.isActive('italic')}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={isDisabled}
        >
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="밑줄"
          active={editor?.isActive('underline')}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          disabled={isDisabled}
        >
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="취소선"
          active={editor?.isActive('strike')}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          disabled={isDisabled}
        >
          <Strikethrough size={14} />
        </ToolbarBtn>

        <ToolbarDivider />

        <ToolbarBtn
          title="왼쪽 정렬"
          active={editor?.isActive({ textAlign: 'left' })}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          disabled={isDisabled}
        >
          <AlignLeft size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="가운데 정렬"
          active={editor?.isActive({ textAlign: 'center' })}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          disabled={isDisabled}
        >
          <AlignCenter size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="오른쪽 정렬"
          active={editor?.isActive({ textAlign: 'right' })}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          disabled={isDisabled}
        >
          <AlignRight size={14} />
        </ToolbarBtn>

        <ToolbarDivider />

        <ToolbarBtn
          title="글머리 기호"
          active={editor?.isActive('bulletList')}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={isDisabled}
        >
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="번호 목록"
          active={editor?.isActive('orderedList')}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          disabled={isDisabled}
        >
          <ListOrdered size={14} />
        </ToolbarBtn>

        <ToolbarDivider />

        <ToolbarBtn
          title="내어쓰기"
          onClick={() => editor?.chain().focus().liftListItem('listItem').run()}
          disabled={isDisabled}
        >
          <Outdent size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          title="들여쓰기"
          onClick={() => editor?.chain().focus().sinkListItem('listItem').run()}
          disabled={isDisabled}
        >
          <Indent size={14} />
        </ToolbarBtn>
      </Flex>

      {/* ── 에디터 본문 ── */}
      {isHtmlMode ? (
        <Textarea
          borderTopRadius="none"
          borderBottomRadius="md"
          minH={minHeight}
          value={value}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
          fontFamily="mono"
          fontSize="xs"
        />
      ) : (
        <Box
          className="rich-html-editor"
          borderWidth="1px"
          borderColor="gray.200"
          borderBottomRadius="md"
          px={4}
          py={3}
          minH={minHeight}
          bg="white"
          cursor="text"
          onClick={() => editor?.commands.focus()}
        >
          <EditorContent editor={editor} />
        </Box>
      )}

      {/* ── 숨김 파일 입력 ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        onChange={(e) => {
          handleUploadLocalImage(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />

      {/* ── 업로드 에러 ── */}
      {uploadError && (
        <Text fontSize="xs" color="red.500" mt={1}>
          {uploadError}
        </Text>
      )}

      {/* ── 사용량 표시 ── */}
      <Box mt={2}>
        <Text fontSize="xs" color="gray.600">
          텍스트 사용량{' '}
          <Text as="span" color="blue.500" fontWeight="bold">
            {textPct}%
          </Text>{' '}
          <Text as="span" fontWeight="bold">
            {formatSize(textSize)}
          </Text>
          /1024KB(1MB)
        </Text>
        <Text fontSize="xs" color="gray.600">
          이미지 사용량{' '}
          <Text as="span" color="blue.500" fontWeight="bold">
            {imagePct}%
          </Text>{' '}
          <Text as="span" fontWeight="bold">
            {formatSize(imageSize)}
          </Text>
          /40960KB(40MB)
        </Text>
        <Text fontSize="xs" color="pink.500" mt={1}>
          [권장 이미지] 사이즈 : 가로 최대 820 px / 용량 : 한 장당 1MB / 형식 : JPG, JPEG, PNG, GIF
        </Text>
      </Box>

      <style jsx global>{`
        .rich-html-editor .ProseMirror {
          min-height: ${minHeight};
          outline: none;
        }
        .rich-html-editor .ProseMirror p {
          margin-bottom: 0.75rem;
        }
        .rich-html-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }
      `}</style>
    </Stack>
  );
}
