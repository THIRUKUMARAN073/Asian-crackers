import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

app.post('/api/send-whatsapp-bill', async (req, res) => {
  try {
    const { customerName, customerPhone, pdfBase64, fileName, grandTotal } = req.body;

    if (!customerPhone || !pdfBase64) {
      return res.status(400).json({ success: false, error: 'Missing phone number or PDF payload' });
    }

    // Convert Base64 back to Binary Buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Upload PDF to Meta WhatsApp Media Endpoint
    const form = new FormData();
    form.append('file', pdfBuffer, {
      filename: fileName || 'Invoice.pdf',
      contentType: 'application/pdf'
    });
    form.append('type', 'application/pdf');
    form.append('messaging_product', 'whatsapp');

    const mediaUploadRes = await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/media`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${WHATSAPP_TOKEN}`
        }
      }
    );

    const mediaId = mediaUploadRes.data.id;

    // Dispatch WhatsApp Document Message
    const messagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: customerPhone,
      type: "document",
      document: {
        id: mediaId,
        caption: `வணக்கம் ${customerName}!\n\nநன்றி! உங்கள் Asian Crackers ஆர்டர் வெற்றிகரமாக பதிவு செய்யப்பட்டது.\nமொத்தத் தொகை: Rs. ${grandTotal}\n\nஉங்கள் பில் (Invoice PDF) இணைக்கப்பட்டுள்ளது. பார்சல் புக்கிங் விவரங்களை விரைவில் அனுப்புவோம்!`,
        filename: fileName || "Asian_Crackers_Bill.pdf"
      }
    };

    await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      messagePayload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WHATSAPP_TOKEN}`
        }
      }
    );

    return res.status(200).json({ success: true, message: 'PDF sent to WhatsApp successfully' });
  } catch (error) {
    console.error('Meta API Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Asian Crackers WhatsApp API Server running on port ${PORT}`));