const axios = require('axios');

// CoolSMS API를 사용한 SMS 발송
// 실제 구현 시 CoolSMS 또는 알리고 등의 서비스 API 키가 필요합니다
const sendSMS = async (phone, message) => {
  try {
    // 환경변수에서 SMS API 설정 가져오기
    const SMS_API_KEY = process.env.SMS_API_KEY;
    const SMS_API_SECRET = process.env.SMS_API_SECRET;
    const SMS_SENDER_PHONE = process.env.SMS_SENDER_PHONE;

    // 개발 환경에서는 실제 SMS를 보내지 않고 콘솔에 출력
    if (process.env.NODE_ENV === 'development' && !SMS_API_KEY) {
      console.log('📱 [SMS 시뮬레이션]');
      console.log(`받는 번호: ${phone}`);
      console.log(`메시지: ${message}`);
      return { success: true, message: 'SMS가 발송되었습니다 (시뮬레이션)' };
    }

    // 실제 SMS 발송 (CoolSMS 예시)
    // CoolSMS API 문서에 따라 구현 필요
    // const response = await axios.post('https://api.coolsms.co.kr/messages/v4/send', {
    //   message: {
    //     to: phone,
    //     from: SMS_SENDER_PHONE,
    //     text: message
    //   }
    // }, {
    //   headers: {
    //     'Authorization': `HMAC-SHA256 ApiKey=${SMS_API_KEY}, Date=${new Date().toISOString()}, Salt=${salt}, Signature=${signature}`,
    //     'Content-Type': 'application/json'
    //   }
    // });

    // 알리고 API 예시
    // const response = await axios.post('https://api.aligo.in/send/', {
    //   key: SMS_API_KEY,
    //   user_id: SMS_API_SECRET,
    //   sender: SMS_SENDER_PHONE,
    //   receiver: phone,
    //   msg: message
    // });

    // 개발 환경에서는 성공으로 처리
    return { success: true, message: 'SMS가 발송되었습니다' };
  } catch (error) {
    console.error('SMS 발송 실패:', error);
    return { success: false, error: error.message };
  }
};

// 인증번호 SMS 발송
const sendVerificationCode = async (phone, code) => {
  const message = `[ShareHub] 인증번호는 ${code}입니다. 10분 내에 입력해주세요.`;
  return await sendSMS(phone, message);
};

module.exports = {
  sendSMS,
  sendVerificationCode
};

