const nodemailer = require('nodemailer');

// Gmail SMTP 설정
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // TLS 사용
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// 연결 테스트 함수
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ SMTP 서버 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ SMTP 서버 연결 실패:', error.message);
    return false;
  }
};

// 이메일 발송 함수
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html
    });
    console.log('📧 이메일 발송 성공:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ 이메일 발송 실패:', error);
    return { success: false, error: error.message };
  }
};

// 인증번호 이메일 발송
const sendVerificationCode = async (email, username, code) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="font-family: 'Malgun Gothic', 'Noto Sans KR', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- 헤더 -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">ShareHub</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 14px;">이웃 간 물품 공유 플랫폼</p>
        </div>
        
        <!-- 본문 -->
        <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none;">
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">안녕하세요, ${username}님! 👋</h2>
          
          <p style="color: #666; line-height: 1.8; font-size: 16px; margin-bottom: 30px;">
            ShareHub 이메일 인증을 위한 인증번호입니다.<br>
            아래 인증번호를 입력해주세요.
          </p>
          
          <!-- 인증번호 박스 -->
          <div style="text-align: center; margin: 40px 0;">
            <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); 
                        border: 2px dashed #667eea; 
                        border-radius: 16px; 
                        padding: 30px;
                        display: inline-block;">
              <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">인증번호</p>
              <div style="font-size: 48px; 
                          font-weight: bold; 
                          letter-spacing: 12px; 
                          color: #667eea;
                          font-family: 'Courier New', monospace;">
                ${code}
              </div>
            </div>
          </div>
          
          <!-- 안내 메시지 -->
          <div style="background: #fff3cd; padding: 15px 20px; border-radius: 8px; margin-top: 30px; border-left: 4px solid #f39c12;">
            <p style="color: #856404; font-size: 14px; margin: 0;">
              ⏰ 이 인증번호는 <strong>10분</strong> 동안 유효합니다.
            </p>
          </div>
        </div>
        
        <!-- 푸터 -->
        <div style="background: #f8f9fa; padding: 25px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 16px 16px;">
          <p style="color: #999; font-size: 12px; margin: 0; line-height: 1.6;">
            본인이 요청하지 않은 경우 이 메일을 무시해주세요.<br>
            인증번호를 타인과 공유하지 마세요.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 15px 0;">
          <p style="color: #bbb; font-size: 11px; margin: 0; text-align: center;">
            © 2025 ShareHub. All rights reserved.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: email,
    subject: `[ShareHub] 인증번호: ${code}`,
    html
  });
};

module.exports = { 
  sendEmail, 
  sendVerificationCode, 
  verifyConnection,
  transporter 
};
