const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');

// @route   GET /api/locations/safe-places
// @desc    안전 거래장소 추천 (파출소, 경찰서 등)
// @access  Private
router.get('/safe-places', protect, async (req, res) => {
  try {
    const { lat, lng, query = '파출소' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: '위도와 경도가 필요합니다' });
    }

    const NAVER_CLIENT_ID = process.env.NAVER_MAP_CLIENT_ID;
    const NAVER_CLIENT_SECRET = process.env.NAVER_MAP_CLIENT_SECRET;

    // 네이버 지도 API가 없으면 기본 안전 장소 반환
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      // 기본 안전 장소 목록 (주요 지역 파출소)
      const defaultSafePlaces = [
        {
          name: '가까운 파출소',
          address: '거래 지역 내 파출소',
          type: 'police',
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          distance: 0
        }
      ];
      return res.json({ success: true, places: defaultSafePlaces });
    }

    // 네이버 지역 검색 API 사용
    const searchQuery = encodeURIComponent(query);
    const apiUrl = `https://openapi.naver.com/v1/search/local.json?query=${searchQuery}&display=10&start=1&sort=random`;

    try {
      const response = await axios.get(apiUrl, {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
        }
      });

      const places = (response.data.items || []).map(item => {
        // 거리 계산 (간단한 하버사인 공식)
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          parseFloat(item.mapy) / 10000000, // 네이버 좌표는 10000000으로 나눠야 함
          parseFloat(item.mapx) / 10000000
        );

        return {
          name: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
          address: item.address,
          roadAddress: item.roadAddress,
          type: 'police',
          lat: parseFloat(item.mapy) / 10000000,
          lng: parseFloat(item.mapx) / 10000000,
          distance: Math.round(distance * 10) / 10, // km, 소수점 1자리
          phone: item.telephone || ''
        };
      });

      // 거리순 정렬
      places.sort((a, b) => a.distance - b.distance);

      res.json({ success: true, places });
    } catch (apiError) {
      console.error('네이버 지도 API 오류:', apiError);
      // API 오류 시 기본 장소 반환
      const defaultSafePlaces = [
        {
          name: '가까운 파출소',
          address: '거래 지역 내 파출소',
          type: 'police',
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          distance: 0
        }
      ];
      res.json({ success: true, places: defaultSafePlaces });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '안전 장소 조회 중 오류가 발생했습니다', error: error.message });
  }
});

// 두 지점 간 거리 계산 (하버사인 공식)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = router;

