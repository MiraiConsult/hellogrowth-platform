import { google } from 'googleapis';

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

export const sendEmail = async (
  accessToken: string,
  emailData: EmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Criar mensagem no formato RFC 2822
    const utf8Subject = `=?utf-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${emailData.to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      emailData.body,
    ];

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      success: true,
      messageId: response.data.id,
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Erro ao enviar email',
    };
  }
};
