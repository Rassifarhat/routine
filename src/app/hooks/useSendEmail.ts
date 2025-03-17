import { useEffect, useState } from 'react';
import { useElementsStore } from '@/store/elementsStore';

interface UseSendEmailProps {
  data: string | { html: string; plainText: string };
}

type EmailResponse = {
  success: boolean;
  message: string;
};

export const useSendEmail = ({ data }: UseSendEmailProps) => {
  const { sendEmailStatus, setSendEmailStatus } = useElementsStore();
  const [response, setResponse] = useState<EmailResponse | null>(null);

  useEffect(() => {
    // Only proceed if emailStatus is 'sending'
    if (sendEmailStatus !== 'sending') {
      if (response !== null) {
        setResponse(null);
      }
      return;
    }
    
    async function sendEmail() {
      try {
        if (!data) {
          console.warn("No data available to send");
          setSendEmailStatus('idle');
          setResponse({
            success: false,
            message: 'No data available to send'
          });
          return;
        }
        
        let plainTextData: string;
        let htmlData: string | undefined;
        let subject: string;
        
        if (typeof data === 'string') {
          plainTextData = data.replace(/<[^>]*>/g, '');
          subject = plainTextData.split(" ").slice(0, 10).join(" ") + "...";
          const containsHtml = /<[a-z][\s\S]*>/i.test(data);
          htmlData = containsHtml ? data : undefined;
        } else {
          plainTextData = data.plainText;
          htmlData = data.html;
          subject = plainTextData.split(" ").slice(0, 10).join(" ") + "...";
        }
        
        const res = await fetch("/api/sendEmail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "farhat.rassi@eih.ae",
            subject,
            text: plainTextData,
            html: htmlData,
            isHtml: !!htmlData
          }),
        });
        const responseData = await res.json();
        console.log(responseData.message || responseData.error);
        setSendEmailStatus('done');
        setResponse({
          success: !responseData.error,
          message: responseData.message || responseData.error || ''
        });
      } catch (error: any) {
        console.error("Error sending email:", error);
        setSendEmailStatus('idle');
        setResponse({
          success: false,
          message: error.message || 'Error sending email'
        });
      }
    }
    
    sendEmail();
    
  }, [sendEmailStatus, setSendEmailStatus, data]);

  return response;
};

export default useSendEmail;