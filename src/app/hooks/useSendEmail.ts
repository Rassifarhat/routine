import { useEffect, useState } from 'react';
import { useElementsStore } from '@/store/elementsStore';

interface UseSendEmailProps {
  data: string;
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
      // Reset response when not sending
      if (response !== null) {
        setResponse(null);
      }
      return;
    }
    
    try {
      if (data) {
        // Create a subject from the first few words of data
        const firstTenWords = data
          .split(" ")
          .slice(0, 10)
          .join(" ")
          .trim() + "...";
        
        fetch("/api/sendEmail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "farhat.rassi@eih.ae",
            subject: firstTenWords,
            text: data,
          }),
        })
          .then(response => response.json())
          .then((responseData) => {
            console.log(responseData.message || responseData.error);
            setSendEmailStatus('done');
            
            // Set the response with success status
            setResponse({
              success: !responseData.error,
              message: responseData.message || responseData.error || ''
            });
          })
          .catch(error => {
            console.error("Error sending email:", error);
            setSendEmailStatus('idle');
            
            // Set the response with error status
            setResponse({
              success: false,
              message: error.message || 'Error sending email'
            });
          });
      } else {
        console.warn("No data available to send");
        setSendEmailStatus('idle');
        
        // Set the response for no data
        setResponse({
          success: false,
          message: 'No data available to send'
        });
      }
    } catch (error: any) {
      console.error("Error in email sending hook:", error);
      setSendEmailStatus('idle');
      
      // Set the response for exception
      setResponse({
        success: false,
        message: error.message || 'Error in email sending hook'
      });
    }
  }, [sendEmailStatus, setSendEmailStatus, data, response]);

  return response;
};

export default useSendEmail;
