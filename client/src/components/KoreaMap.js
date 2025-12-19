import React, { useRef } from 'react';
import './KoreaMap.css';

// 지역 이미지 import
import seoulImg from '../assets/regions/서울.png';
import busanImg from '../assets/regions/부산.png';
import daeguImg from '../assets/regions/대구.png';
import incheonImg from '../assets/regions/인천.png';
import gwangjuImg from '../assets/regions/광주.png';
import daejeonImg from '../assets/regions/대전.png';
import ulsanImg from '../assets/regions/울산.png';
import sejongImg from '../assets/regions/세종.png';
import gyeonggiImg from '../assets/regions/경기.png';
import gangwonImg from '../assets/regions/강원.png';
import chungbukImg from '../assets/regions/충북.png';
import chungnamImg from '../assets/regions/충남.png';
import jeonbukImg from '../assets/regions/전북.png';
import jeonnamImg from '../assets/regions/전남.png';
import gyeongbukImg from '../assets/regions/경북.png';
import gyeongnamImg from '../assets/regions/경남.png';
import jejuImg from '../assets/regions/제주.png';

// 지역 코드 → 정식 명칭 매핑
const REGION_NAMES = {
  "서울": "서울특별시",
  "부산": "부산광역시",
  "대구": "대구광역시",
  "인천": "인천광역시",
  "광주": "광주광역시",
  "대전": "대전광역시",
  "울산": "울산광역시",
  "세종": "세종특별자치시",
  "경기": "경기도",
  "강원": "강원특별자치도",
  "충북": "충청북도",
  "충남": "충청남도",
  "전북": "전북특별자치도",
  "전남": "전라남도",
  "경북": "경상북도",
  "경남": "경상남도",
  "제주": "제주특별자치도"
};

// 정식 명칭 → 지역 코드 역매핑
const REGION_CODES = Object.fromEntries(
  Object.entries(REGION_NAMES).map(([code, name]) => [name, code])
);

// 각 지역의 이미지와 zIndex (작은 지역이 위에 오도록)
const REGION_DATA = {
  "강원": { image: gangwonImg, zIndex: 1 },
  "경기": { image: gyeonggiImg, zIndex: 1 },
  "충북": { image: chungbukImg, zIndex: 2 },
  "충남": { image: chungnamImg, zIndex: 2 },
  "경북": { image: gyeongbukImg, zIndex: 2 },
  "경남": { image: gyeongnamImg, zIndex: 2 },
  "전북": { image: jeonbukImg, zIndex: 2 },
  "전남": { image: jeonnamImg, zIndex: 2 },
  "제주": { image: jejuImg, zIndex: 1 },
  "인천": { image: incheonImg, zIndex: 5 },
  "서울": { image: seoulImg, zIndex: 10 },
  "세종": { image: sejongImg, zIndex: 10 },
  "대전": { image: daejeonImg, zIndex: 10 },
  "광주": { image: gwangjuImg, zIndex: 10 },
  "대구": { image: daeguImg, zIndex: 10 },
  "울산": { image: ulsanImg, zIndex: 10 },
  "부산": { image: busanImg, zIndex: 10 }
};

const KoreaMap = ({ selectedRegion, onRegionSelect }) => {
  const containerRef = useRef(null);
  const imageRefs = useRef({});

  // 컨테이너 클릭 핸들러 - 모든 이미지를 체크해서 가장 위에 있는 것 선택
  const handleContainerClick = (e) => {
    const container = containerRef.current;
    if (!container) return;

    // zIndex가 높은 순서대로 (위에서 아래로) 체크
    const sortedRegions = Object.entries(REGION_DATA)
      .sort((a, b) => b[1].zIndex - a[1].zIndex); // 높은 zIndex 먼저

    let clickedRegion = null;

    for (const [region] of sortedRegions) {
      const img = imageRefs.current[region];
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      const imgRect = img.getBoundingClientRect();
      const imgX = e.clientX - imgRect.left;
      const imgY = e.clientY - imgRect.top;

      // 이미지 범위 내인지 확인
      if (imgX < 0 || imgX >= imgRect.width || imgY < 0 || imgY >= imgRect.height) {
        continue;
      }

      // Canvas로 픽셀 확인
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      // 클릭 위치를 이미지 크기에 맞게 조정
      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;
      const pixelX = Math.floor(imgX * scaleX);
      const pixelY = Math.floor(imgY * scaleY);

      // 범위 체크
      if (pixelX < 0 || pixelX >= canvas.width || pixelY < 0 || pixelY >= canvas.height) {
        continue;
      }

      // 픽셀의 알파값 확인
      const pixelData = ctx.getImageData(pixelX, pixelY, 1, 1).data;
      const alpha = pixelData[3];

      // 투명하지 않은 부분이면 이 지역 선택
      if (alpha >= 10) {
        clickedRegion = region;
        break;
      }
    }

    // 빈 곳 클릭 시 선택 해제, 지역 클릭 시 선택
    if (clickedRegion) {
      onRegionSelect(clickedRegion);
    } else {
      onRegionSelect('');
    }
  };

  // 선택된 지역의 정식 명칭 가져오기
  const getDisplayName = (regionCode) => {
    return REGION_NAMES[regionCode] || regionCode;
  };

  return (
    <div className="korea-map-wrapper">
      <div 
        ref={containerRef}
        className="korea-map-container"
        onClick={handleContainerClick}
      >
        {Object.entries(REGION_DATA)
          .sort((a, b) => a[1].zIndex - b[1].zIndex) // zIndex 순서로 렌더링
          .map(([region, data]) => {
            const isSelected = selectedRegion === region;
            return (
              <img
                key={region}
                ref={(el) => {
                  if (el) imageRefs.current[region] = el;
                }}
                src={data.image}
                alt={getDisplayName(region)}
                className={`region-image ${isSelected ? 'selected' : ''}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: 'auto',
                  zIndex: data.zIndex + (isSelected ? 100 : 0),
                  pointerEvents: 'none' // 이미지 자체 클릭 비활성화, 컨테이너에서 처리
                }}
                draggable={false}
              />
            );
          })}
      </div>
      
      {selectedRegion && (
        <div className="selected-badge">
          <span className="badge-icon">📍</span>
          <span className="badge-text">{getDisplayName(selectedRegion)}</span>
        </div>
      )}
    </div>
  );
};

export default KoreaMap;
export { REGION_NAMES, REGION_CODES };
