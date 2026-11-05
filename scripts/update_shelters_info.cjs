const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://johtqemdlprtbpohdkgu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

// 안내소 및 대피소 정보 데이터베이스
const FACILITY_INFO_MAP = {
  // 1구간
  "poi_동서트레일태_p3px44": {
    name: "동서트레일 태안안내소",
    phone: "1588-3250",
    homepage: "https://www.foresttrip.go.kr",
    business_hours: "연중무휴 09:00 ~ 18:00",
    photo_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    description: "동서트레일 849km 한반도 횡단 대장정의 서쪽 기점인 안면도 꽃지해변에 자리잡은 공식 거점 안내소입니다. 안내데스크, 스탬프 인증대, 화장실, 급수시설, 백패킹 쉼터를 완비하고 있습니다.",
    memo: "홈페이지: https://www.foresttrip.go.kr | 문의: 숲나들e(1588-3250), 태안군청(041-670-2114)"
  },
  // 2구간
  "poi_동서트레일별_r1u93x": {
    name: "동서트레일 별주부마을안내소",
    phone: "041-672-3359",
    homepage: "https://byeoljubu.kr",
    business_hours: "09:00 ~ 18:00",
    photo_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    description: "태안 별주부전 설화의 발원지인 별주부마을 커뮤니티센터 내 동서트레일 거점 안내소입니다. 갯벌 생태체험 및 숲길 코스 안내, 스탬프북 배부, 급수 및 휴게 공간을 제공합니다.",
    memo: "홈페이지: https://byeoljubu.kr | 문의: 041-672-3359"
  },
  "poi_동서트레일태_y58913": {
    name: "동서트레일 태안대피소 (꽃지)",
    phone: "1588-3250",
    homepage: "https://www.foresttrip.go.kr",
    business_hours: "상시 개방 (야영 가능)",
    photo_url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80",
    description: "태안 꽃지해변 곰솔림 자락에 마련된 동서트레일 백패킹 야영 대피소입니다. 평상 데크, 급수대, 화장실, 가스스토브 취사 가능 공간이 조성되어 있습니다.",
    memo: "예약: 숲나들e(https://www.foresttrip.go.kr) | 문의: 1588-3250"
  },
  // 4구간
  "poi_흥주사대피소_6j7f3v": {
    name: "흥주사대피소",
    phone: "041-674-3282",
    homepage: "https://www.taean.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80",
    description: "태안 백화산 자락 천년고찰 흥주사 인근 숲길에 조성된 대피소입니다. 백패킹 데크, 화장실, 약수터 급수시설이 구비되어 있어 편안한 산림 휴식을 취할 수 있습니다.",
    memo: "문의: 흥주사(041-674-3282) / 태안군 산림축산과(041-670-2415)"
  },
  // 5구간
  "poi_동서트레일서_1ciyoh": {
    name: "동서트레일 서산안내소",
    phone: "041-660-2441",
    homepage: "https://www.seosan.go.kr",
    business_hours: "09:00 ~ 18:00",
    photo_url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
    description: "서산 풍전저수지 수변 산림공원에 위치한 동서트레일 서산 거점 안내센터입니다. 서산 숲길 지도, 완주 스탬프 날인, 편의시설 및 급수 안내를 제공합니다.",
    memo: "홈페이지: https://www.seosan.go.kr | 문의: 서산시 산림공원과(041-660-2441)"
  },
  "poi_서산대피소조_5ucahs": {
    name: "서산대피소 (풍전)",
    phone: "041-660-2441",
    homepage: "https://www.foresttrip.go.kr",
    business_hours: "상시 개방 (야영 가능)",
    photo_url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80",
    description: "서산안내소와 연계된 친환경 백패킹 야영 대피소입니다. 야영 데크와 안전 가스스토브 조리 공간, 화장실을 이용할 수 있습니다.",
    memo: "문의: 서산시 산림공원과(041-660-2441)"
  },
  // 6구간
  "poi_간대산대피소_ys2avy": {
    name: "간대산대피소",
    phone: "041-660-2441",
    homepage: "https://www.seosan.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80",
    description: "서산 간대산 능선부에 위치하여 서해 바다와 내포 평야를 360도 조망할 수 있는 산림 쉼터 및 백패킹 대피소입니다.",
    memo: "문의: 서산시 산림공원과(041-660-2441)"
  },
  // 7구간
  "poi_영탑사대피소_57z31w": {
    name: "영탑사대피소",
    phone: "041-356-3244",
    homepage: "https://www.dangjin.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80",
    description: "당진 아미산-다솔산 자락 고찰 영탑사 인근에 조성된 산림 야영 대피소입니다. 화장실, 급수시설 및 백패킹 쉼터 공간이 완비되어 있습니다.",
    memo: "문의: 영탑사(041-356-3244) / 당진시 산림녹지과(041-350-4181)"
  },
  // 8구간
  "poi_내포문화숲길_g72v8y": {
    name: "내포문화숲길 예산센터안내소",
    phone: "041-338-0773",
    homepage: "https://www.naepotrail.org",
    business_hours: "화~일 09:00 ~ 18:00 (월요일 휴무)",
    photo_url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
    description: "사단법인 내포문화숲길 중앙사무국이자 가야산 들머리에 위치한 동서트레일 8구간 종합 안내소입니다. 숲길 해설 프로그램 및 상세 지도, 스탬프를 제공합니다.",
    memo: "홈페이지: https://www.naepotrail.org | 전화: 041-338-0773"
  },
  // 9구간
  "poi_동서트레일용_u0k4o5": {
    name: "동서트레일 용봉산주차장안내소",
    phone: "041-630-1785",
    homepage: "https://www.hongseong.go.kr",
    business_hours: "09:00 ~ 18:00",
    photo_url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
    description: "기암괴석으로 유명한 제2의 금강산 용봉산 자연휴양림 입구 주차장에 위치한 안내센터입니다. 동서트레일 및 용봉산 등산로 코스 가이드와 편의시설을 제공합니다.",
    memo: "홈페이지: https://www.hongseong.go.kr | 문의: 041-630-1785"
  },
  "poi_용봉산돌바위_w5l66q": {
    name: "용봉산돌바위마을대피소",
    phone: "041-630-1785",
    homepage: "https://www.foresttrip.go.kr",
    business_hours: "상시 개방 (야영 가능)",
    photo_url: "https://images.unsplash.com/photo-1487730116645-74489c95b41b?auto=format&fit=crop&w=800&q=80",
    description: "용봉산 돌바위마을 숲속에 조성된 백패킹 야영 대피소입니다. 야영 데크와 가스스토브 조리 편의, 용봉산 주차장 화장실 및 급수시설을 함께 이용할 수 있습니다.",
    memo: "문의: 용봉산휴양림(041-630-1785)"
  },
  // 10구간
  "poi_백월산간이대_j205w7": {
    name: "백월산간이대피소",
    phone: "041-630-1407",
    homepage: "https://www.hongseong.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=800&q=80",
    description: "홍성 백월산 정상 능선에 위치하여 서해 천수만과 내포신도시 전경을 감상할 수 있는 간이 백패킹 대피소입니다.",
    memo: "문의: 홍성군 산림녹지과(041-630-1407)"
  },
  // 11구간
  "poi_그림같은수목_n4y82v": {
    name: "그림같은수목원간이대피소",
    phone: "041-641-8008",
    homepage: "https://www.hongseong.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80",
    description: "오서산 서쪽 자락 그림같은수목원 및 오서산 상담주차장 인근에 위치한 백패킹 쉼터 대피소입니다. 화장실과 휴식 공간이 제공됩니다.",
    memo: "문의: 그림같은수목원(041-641-8008) / 홍성군(041-630-1407)"
  },
  "poi_내포문화숲길_00tq6k": {
    name: "내포문화숲길 홍성센터",
    phone: "041-635-1661",
    homepage: "https://www.naepotrail.org",
    business_hours: "화~일 09:00 ~ 18:00 (월요일 휴무)",
    photo_url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    description: "남산산림욕장 및 충령사 입구에 위치하여 홍성 지역 동서트레일과 내포문화숲길 원더길을 종합 안내하는 센터입니다. 휴게실 및 트레커 편의를 지원합니다.",
    memo: "홈페이지: https://www.naepotrail.org | 전화: 041-635-1661"
  },
  // 12구간
  "poi_대현1리마을_h1o9r2": {
    name: "대현1리마을회관대피소",
    phone: "041-630-9286",
    homepage: "https://www.hongseong.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80",
    description: "장곡면 대현1리 마을공동체와 상생 운영되는 트레커 쉼터 대피소입니다. 깨끗한 화장실, 온수 급수, 가스스토브 취사 공간, 백패킹 야영 터를 제공합니다.",
    memo: "문의: 장곡면 행정복지센터(041-630-9286)"
  },
  // 20구간
  "poi_동서트레일대_s9k70d": {
    name: "동서트레일 대전안내소",
    phone: "042-620-6300",
    homepage: "https://komount.or.kr",
    business_hours: "화~일 09:00 ~ 18:00",
    photo_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    description: "대청호반의 아름다운 물빛을 품은 대청호 물문화관 인근 동서트레일 대전 공식 거점 안내소입니다. 대전 둘레산길 및 동서트레일 중부 코스 안내를 담당합니다.",
    memo: "홈페이지: https://komount.or.kr | 문의: 한국등산트레킹지원센터(042-620-6300)"
  },
  // 32구간
  "poi_송덕리간이대_a9d3p0": {
    name: "송덕리간이대피소",
    phone: "043-830-3274",
    homepage: "https://www.goesan.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
    description: "충북 괴산군 장연면 송덕리 숲길에 위치한 백패킹 대피소입니다. 연풍면 행촌리 대피소와 연계되어 안전한 쉼터를 제공합니다.",
    memo: "문의: 괴산군 산림녹지과(043-830-3274)"
  },
  // 33구간
  "poi_분지리간이대_g4d23x": {
    name: "분지리간이대피소",
    phone: "043-830-3274",
    homepage: "https://www.goesan.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80",
    description: "백두대간 백화산 자락 청정 분지골 계곡 가에 위치한 야영 대피소입니다. 야영 데크, 화장실, 급수시설, 가스스토브 취사 공간을 갖추고 있습니다.",
    memo: "문의: 괴산군 산림녹지과(043-830-3274)"
  },
  // 34구간
  "poi_동서트레일문_790v2u": {
    name: "동서트레일 문경안내소",
    phone: "054-550-6575",
    homepage: "https://www.gbmg.go.kr",
    business_hours: "09:00 ~ 18:00",
    photo_url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
    description: "문경에코랄라와 가은아자개시장 인근에 위치한 경북 문경 거점 안내소입니다. 문경새재와 선유동계곡으로 이어지는 숲길 탐방 정보를 제공합니다.",
    memo: "홈페이지: https://www.gbmg.go.kr | 문의: 문경시 산림녹지과(054-550-6575)"
  },
  // 35구간
  "poi_동서트레일상_20t3d4": {
    name: "동서트레일 상주안내소",
    phone: "054-537-8114",
    homepage: "https://www.sangju.go.kr",
    business_hours: "09:00 ~ 18:00",
    photo_url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
    description: "상주 명주테마파크와 삼백(쌀, 곶감, 명주)의 고장 함창읍에 조성된 동서트레일 거점 안내소입니다. 낙동강 자전거길 및 숲길 연계 안내를 지원합니다.",
    memo: "홈페이지: https://www.sangju.go.kr | 문의: 상주시(054-537-8114)"
  },
  // 36구간
  "poi_이목리간이대_g4w68f": {
    name: "이목리간이대피소",
    phone: "054-550-6575",
    homepage: "https://www.gbmg.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1487730116645-74489c95b41b?auto=format&fit=crop&w=800&q=80",
    description: "문경시 영순면 영강과 낙동강 수계가 만나는 청정 능선 숲길에 위치한 간이 백패킹 대피소입니다.",
    memo: "문의: 문경시 산림녹지과(054-550-6575)"
  },
  // 46구간
  "poi_동서트레일외_v56x8c": {
    name: "동서트레일 외씨버선길안내소 (봉화객주)",
    phone: "054-672-0803",
    homepage: "https://www.beosun.com",
    business_hours: "화~일 09:00 ~ 18:00",
    photo_url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    description: "조선 3대 탄산약수인 오전약수탕 입구에 위치한 외씨버선길 봉화객주이자 동서트레일 거점 안내소입니다. 숲길 지도, 기념품, 탐방 패스포트 인증이 가능합니다.",
    memo: "홈페이지: https://www.beosun.com | 전화: 054-672-0803"
  },
  // 47구간
  "poi_오전2리오전_3w179b": {
    name: "오전2리 오전약수터대피소",
    phone: "054-679-6382",
    homepage: "https://www.bonghwa.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80",
    description: "오전약수터 및 도심3리 마을숲에 조성된 백패킹 야영 대피소입니다. 울창한 소나무 숲속 평상 데크, 화장실, 약수 음수대가 완비되어 있습니다.",
    memo: "문의: 봉화군 산림녹지과(054-679-6382)"
  },
  // 48구간
  "poi_동서트레일춘_0d0p78": {
    name: "동서트레일 춘양안내소",
    phone: "054-679-6382",
    homepage: "https://www.bonghwa.go.kr",
    business_hours: "09:00 ~ 18:00",
    photo_url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
    description: "국립백두대간수목원과 억지춘양시장, 춘양역 길목에 위치한 봉화 중심 안내소입니다. 춘양목 금강송 숲길 및 동서트레일 탐방 안내를 제공합니다.",
    memo: "홈페이지: https://www.bonghwa.go.kr | 문의: 054-679-6382"
  },
  "poi_춘양대피소_6y08s3": {
    name: "춘양대피소",
    phone: "054-679-6382",
    homepage: "https://www.foresttrip.go.kr",
    business_hours: "상시 개방 (야영 가능)",
    photo_url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80",
    description: "춘양안내소와 연계된 백패킹 야영 대피소입니다. 시장 및 대중교통 접근성이 우수하며 화장실, 음수대 등 편의시설을 갖추고 있습니다.",
    memo: "문의: 봉화군 산림녹지과(054-679-6382)"
  },
  // 50구간
  "poi_동서트레일분_13x9u8": {
    name: "동서트레일 분천안내소",
    phone: "1588-3250",
    homepage: "https://www.foresttrip.go.kr",
    business_hours: "09:00 ~ 18:00",
    photo_url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
    description: "분천역 산타마을 및 낙동정맥트레일 시발점에 위치한 이국적인 동서트레일 거점 안내센터입니다. 트레일 정보 안내와 스탬프 투어를 운영합니다.",
    memo: "홈페이지: https://www.foresttrip.go.kr | 문의: 숲나들e(1588-3250)"
  },
  "poi_현동3리마을_r6465s": {
    name: "현동3리마을숲간이대피소",
    phone: "054-679-6382",
    homepage: "https://www.bonghwa.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80",
    description: "봉화 소천면 현동3리 아름다운 마을숲에 마련된 백패킹 쉼터 대피소입니다. 화장실과 가스스토브 조리가 가능합니다.",
    memo: "문의: 봉화군 산림녹지과(054-679-6382)"
  },
  // 51구간
  "poi_척구마을간이_022g9y": {
    name: "척구마을간이대피소",
    phone: "054-679-6382",
    homepage: "https://www.bonghwa.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=800&q=80",
    description: "청정 봉화 소천면 분천리 척구마을 오지 숲길에 위치한 백패킹 간이대피소입니다. 깊은 산속 고요한 야영과 휴식이 가능합니다.",
    memo: "문의: 봉화군 산림녹지과(054-679-6382)"
  },
  // 52구간
  "poi_동서트레일전_878i1u": {
    name: "동서트레일 전곡리안내소",
    phone: "054-780-3900",
    homepage: "https://www.foresttrip.go.kr",
    business_hours: "09:00 ~ 18:00",
    photo_url: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80",
    description: "울진 금강소나무숲길 서쪽 기점인 금강송면 전곡리에 위치한 동서트레일 거점 안내소입니다. 국유림 숲길 출입 및 예약 안내를 담당합니다.",
    memo: "홈페이지: https://www.foresttrip.go.kr | 문의: 울진국유림관리소(054-780-3900)"
  },
  "poi_전곡리대피소_6y08s3": {
    name: "전곡리대피소",
    phone: "054-780-3900",
    homepage: "https://www.foresttrip.go.kr",
    business_hours: "상시 개방 (야영 가능)",
    photo_url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80",
    description: "전곡리 안내소와 연계된 울진 금강송림 숲속 백패킹 대피소입니다. 화장실, 야영 데크, 취사 공간을 갖추고 있습니다.",
    memo: "예약: 숲나들e(https://www.foresttrip.go.kr) | 문의: 054-780-3900"
  },
  // 53구간
  "poi_찬물내기간이_z6z60c": {
    name: "찬물내기간이대피소",
    phone: "054-789-6832",
    homepage: "https://www.uljin.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
    description: "왕피천 유역 청정 협곡 찬물내기 계곡 숲길에 위치한 간이대피소입니다. 여름철 시원한 냉천과 깊은 숲속 트레커 쉼터를 제공합니다.",
    memo: "문의: 울진군청 산림과(054-789-6832)"
  },
  // 54구간
  "poi_두천리대피소_398e0w": {
    name: "두천리대피소",
    phone: "054-781-7118",
    homepage: "https://www.uljintrail.or.kr",
    business_hours: "상시 개방 (야영 가능)",
    photo_url: "https://images.unsplash.com/photo-1487730116645-74489c95b41b?auto=format&fit=crop&w=800&q=80",
    description: "조선 보부상 옛길이자 국가숲길인 울진 금강소나무숲길 1구간 출발점 두천리에 조성된 거점 대피소입니다. 야영 데크, 최신 화장실, 온수 샤워, 취사 편의를 완비하고 있습니다.",
    memo: "홈페이지: https://www.uljintrail.or.kr | 문의: 금강소나무숲길(054-781-7118)"
  },
  // 55구간
  "poi_국립울진동서_q0i1b2": {
    name: "국립울진동서트레일센터",
    phone: "054-780-3900",
    homepage: "https://www.foresttrip.go.kr",
    business_hours: "화~일 09:00 ~ 18:00 (월요일 휴무)",
    photo_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    description: "대한민국 국토를 동서로 가로지르는 849km 동서트레일의 총괄 컨트롤타워이자 동쪽 종점 광역 거점센터입니다. 기획전시관, 트레커 종합지원센터, 장비 대여 및 교육 공간을 갖추고 있습니다.",
    memo: "홈페이지: https://www.foresttrip.go.kr | 문의: 산림청/울진국유림관리소(054-780-3900)"
  },
  "poi_하원리대피소_9v417d": {
    name: "하원리대피소",
    phone: "054-789-6832",
    homepage: "https://www.uljin.go.kr",
    business_hours: "상시 개방",
    photo_url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80",
    description: "불영계곡 하류 및 망양정으로 향하는 숲길목 하원리에 위치한 야영 대피소입니다. 불영사 계곡의 절경과 함께 안전한 휴식을 제공합니다.",
    memo: "문의: 울진군청 산림과(054-789-6832)"
  }
};

async function run() {
  console.log('🚀 Starting Information & Shelter Data Update...');
  const dir = 'public/data/sections';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

  let updatedCount = 0;
  const dbRecordsToUpsert = [];

  for (const f of files) {
    const filePath = path.join(dir, f);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const sectionId = content.section_id;
    let fileChanged = false;

    if (content.pois && Array.isArray(content.pois)) {
      for (const poi of content.pois) {
        let matchInfo = FACILITY_INFO_MAP[poi.id];
        
        // ID 매칭이 없을 경우 이름 유사도 기반 매칭 보완
        if (!matchInfo) {
          for (const [key, val] of Object.entries(FACILITY_INFO_MAP)) {
            const cleanPoiName = poi.name.split(':')[0].trim();
            const cleanMapName = val.name.split('(')[0].trim();
            if (cleanPoiName.includes(cleanMapName) || cleanMapName.includes(cleanPoiName)) {
              matchInfo = val;
              break;
            }
          }
        }

        if (matchInfo) {
          poi.name = matchInfo.name;
          poi.phone = matchInfo.phone;
          poi.photo_url = matchInfo.photo_url;
          poi.description = matchInfo.description;
          poi.business_hours = matchInfo.business_hours;
          poi.memo = matchInfo.memo;
          // 카테고리도 안내소/대피소에 맞게 정밀 지정
          if (matchInfo.name.includes('안내소') || matchInfo.name.includes('센터')) {
            poi.category = 'cert_center';
            poi.categories = ['cert_center', 'lodging', 'toilet'];
          } else if (matchInfo.name.includes('대피소')) {
            poi.category = 'shelter';
            poi.categories = ['shelter', 'lodging', 'toilet'];
          }

          dbRecordsToUpsert.push({
            id: poi.id,
            section_id: sectionId,
            name: poi.name,
            category: poi.category,
            categories: poi.categories || [poi.category],
            lat: poi.lat,
            lng: poi.lng,
            phone: poi.phone,
            business_hours: poi.business_hours,
            memo: poi.memo,
            photo_url: poi.photo_url,
            is_official: true,
            is_deleted: false,
            updated_at: new Date().toISOString()
          });

          fileChanged = true;
          updatedCount++;
        }
      }
    }

    if (fileChanged) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
      console.log(`✅ [JSON Updated] ${f}`);
    }
  }

  console.log(`\n🎉 Total POIs Updated in JSON: ${updatedCount}`);

  // Supabase DB 업서트 동기화
  console.log(`\n📡 Upserting ${dbRecordsToUpsert.length} records into Supabase 'ewt_facilities'...`);
  for (const record of dbRecordsToUpsert) {
    try {
      const { error } = await client.from('ewt_facilities').upsert(record);
      if (error) {
        console.warn(`⚠️ Supabase upsert error for ${record.name}:`, error.message);
      } else {
        console.log(`✨ [Supabase Synced] ${record.name} (${record.id})`);
      }
    } catch (e) {
      console.warn(`⚠️ Supabase network error for ${record.name}:`, e.message);
    }
  }

  console.log('\n🏁 Facility Update Completed Successfully!');
}

run().catch(console.error);
