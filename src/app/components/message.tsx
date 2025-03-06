import { Card, CardHeader } from "./UI/card";
import { Bot, User } from "lucide-react";
import { Message as MessageType } from "ai";
import ReactMarkdown from 'react-markdown';

export default function Message({ message }: { message: MessageType }) {
  const { role, content } = message;
  if (role === "assistant") {
    return (
        <div className="mb-4 p-4 rounded-lg bg-white text-black">
          <div className="flex items-center gap-2 mb-2 font-medium">
            <Bot className="text-blue-600" />
            <span>Surgical Report</span>
          </div>
          <div className="pl-2 border-l-2 border-blue-200">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold my-4" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold my-3" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold my-2" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2" {...props} />,
                li: ({node, ...props}) => <li className="my-1" {...props} />,
                p: ({node, ...props}) => <p className="my-2" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                em: ({node, ...props}) => <em className="italic" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2" {...props} />,
                code: ({node, ...props}) => <code className="bg-gray-100 px-1 rounded" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-gray-100 p-2 rounded my-2 overflow-auto" {...props} />
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      );
    
  }
  // For user messages (hidden in this context)
  return (
    <div className="hidden">
      {/* User messages are not displayed in the surgical scribe context */}
      {content}
    </div>
  );
}
