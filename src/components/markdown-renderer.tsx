import ReactMarkdown from "react-markdown";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="research-output">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
