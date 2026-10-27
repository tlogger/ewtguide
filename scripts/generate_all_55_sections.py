import json
import os
import math

def calc_hiking_time(dist_km, gain_m, loss_m):
    # Munter / Tobler hiking time formula tailored for trail walking:
    # 3.5 km/h base flat walking + 1 hr per 400m ascent + 1 hr per 800m descent
    hours_float = (dist_km / 3.5) + (gain_m / 400.0) + (loss_m / 800.0)
    total_minutes = int(round(hours_float * 60))
    h = total_minutes // 60
    m = total_minutes % 60
    if h > 0 and m > 0:
        text = f"{h}시간 {m}분"
    elif h > 0:
        text = f"{h}시간"
    else:
        text = f"{m}분"
    return {
        "hiking_time_hours": round(hours_float, 1),
        "hiking_time_text": text
    }

# 23 Unopened sections definitions
UNOPENED_SECTIONS = [
    # 15 ~ 19: 공주 ~ 세종 ~ 대전
    {
        "id": 15, "region": "공주시", "dist": 15.2,
        "course": "15구간 : 대룡1리 ~ 유구마을 ~ 문금리 ~ 마곡사 입구",
        "start": (36.4927, 126.9405), "end": (36.5583, 127.0125), "gain": 420, "loss": 380, "min_e": 95, "max_e": 380
    },
    {
        "id": 16, "region": "공주시", "dist": 16.5,
        "course": "16구간 : 마곡사 입구 ~ 정안천생태공원 ~ 정안면사무소 ~ 밤소리길",
        "start": (36.5583, 127.0125), "end": (36.5412, 127.1350), "gain": 380, "loss": 410, "min_e": 85, "max_e": 310
    },
    {
        "id": 17, "region": "세종시", "dist": 14.8,
        "course": "17구간 : 장군면 ~ 정부세종청사 ~ 세종호수공원 ~ 국립세종수목원",
        "start": (36.5412, 127.1350), "end": (36.4950, 127.2850), "gain": 180, "loss": 190, "min_e": 35, "max_e": 120
    },
    {
        "id": 18, "region": "세종시, 대전시", "dist": 15.6,
        "course": "18구간 : 국립세종수목원 ~ 금강보행교 ~ 부강면 ~ 현도교",
        "start": (36.4950, 127.2850), "end": (36.4710, 127.3420), "gain": 190, "loss": 185, "min_e": 40, "max_e": 140
    },
    {
        "id": 19, "region": "대전시 대덕구", "dist": 13.9,
        "course": "19구간 : 현도교 ~ 대청댐 잔도길 ~ 용호동 ~ 봉산동버스기점",
        "start": (36.4710, 127.3420), "end": (36.4485, 127.3845), "gain": 220, "loss": 210, "min_e": 45, "max_e": 180
    },

    # 23 ~ 31: 옥천 ~ 보은 ~ 속리산 ~ 상주 ~ 괴산
    {
        "id": 23, "region": "충북 옥천군", "dist": 16.2,
        "course": "23구간 : 와정삼거리 ~ 대청호반길 ~ 군북면사무소 ~ 장계관광지",
        "start": (36.3905, 127.5322), "end": (36.3520, 127.6180), "gain": 340, "loss": 320, "min_e": 85, "max_e": 260
    },
    {
        "id": 24, "region": "충북 옥천군, 보은군", "dist": 15.8,
        "course": "24구간 : 장계관광지 ~ 안내면 ~ 삼승면 ~ 보은읍 서원계곡",
        "start": (36.3520, 127.6180), "end": (36.4450, 127.7120), "gain": 390, "loss": 350, "min_e": 110, "max_e": 340
    },
    {
        "id": 25, "region": "충북 보은군", "dist": 14.5,
        "course": "25구간 : 보은읍 ~ 삼가저수지 ~ 만수계곡 ~ 속리산 법주사 입구",
        "start": (36.4450, 127.7120), "end": (36.5320, 127.8150), "gain": 460, "loss": 390, "min_e": 180, "max_e": 480
    },
    {
        "id": 26, "region": "보은군, 상주시", "dist": 16.0,
        "course": "26구간 : 속리산 정이품송 ~ 말티재 ~ 화북면 ~ 문장대 야영장",
        "start": (36.5320, 127.8150), "end": (36.5780, 127.8920), "gain": 680, "loss": 620, "min_e": 280, "max_e": 740
    },
    {
        "id": 27, "region": "경북 상주시", "dist": 15.3,
        "course": "27구간 : 화북면 문장대 ~ 용유계곡 ~ 화서면 반송리",
        "start": (36.5780, 127.8920), "end": (36.5210, 127.9550), "gain": 410, "loss": 430, "min_e": 220, "max_e": 510
    },
    {
        "id": 28, "region": "상주시, 괴산군", "dist": 14.7,
        "course": "28구간 : 화서면 ~ 화북면 상송리 ~ 괴산 청천면 관평리",
        "start": (36.5210, 127.9550), "end": (36.6320, 127.8950), "gain": 450, "loss": 440, "min_e": 190, "max_e": 480
    },
    {
        "id": 29, "region": "충북 괴산군", "dist": 15.5,
        "course": "29구간 : 청천면 관평리 ~ 화양구곡 ~ 선유동계곡 ~ 송면리",
        "start": (36.6320, 127.8950), "end": (36.6980, 127.8650), "gain": 380, "loss": 390, "min_e": 160, "max_e": 360
    },
    {
        "id": 30, "region": "충북 괴산군", "dist": 14.9,
        "course": "30구간 : 칠성면 ~ 산막이옛길 ~ 갈은구곡 ~ 괴산호반길",
        "start": (36.6980, 127.8650), "end": (36.7450, 127.8420), "gain": 320, "loss": 310, "min_e": 130, "max_e": 310
    },
    {
        "id": 31, "region": "충북 괴산군", "dist": 15.4,
        "course": "31구간 : 괴산호 ~ 쌍곡계곡 입구 ~ 칠성면사무소 ~ 연풍면 태성리",
        "start": (36.7450, 127.8420), "end": (36.7762, 127.8882), "gain": 360, "loss": 320, "min_e": 145, "max_e": 350
    },

    # 37 ~ 45: 문경 ~ 예천 ~ 안동 ~ 영주 ~ 단양
    {
        "id": 37, "region": "문경시, 예천군", "dist": 16.4,
        "course": "37구간 : 이목리 ~ 산양면 ~ 금천강변길 ~ 예천군 용궁면 회룡포",
        "start": (36.5531, 128.2656), "end": (36.5820, 128.3450), "gain": 180, "loss": 210, "min_e": 65, "max_e": 190
    },
    {
        "id": 38, "region": "경북 예천군", "dist": 15.2,
        "course": "38구간 : 회룡포 전망대 ~ 삼강주막 ~ 개포면 ~ 예천읍 남산공원",
        "start": (36.5820, 128.3450), "end": (36.6450, 128.4320), "gain": 220, "loss": 210, "min_e": 75, "max_e": 230
    },
    {
        "id": 39, "region": "경북 예천군", "dist": 16.0,
        "course": "39구간 : 예천읍 ~ 한천체육공원 ~ 호명면 ~ 경북도청신도시 천년숲",
        "start": (36.6450, 128.4320), "end": (36.5820, 128.5120), "gain": 160, "loss": 170, "min_e": 80, "max_e": 180
    },
    {
        "id": 40, "region": "예천군, 안동시", "dist": 15.5,
        "course": "40구간 : 경북도청신도시 ~ 풍천면 ~ 안동 하회마을 ~ 병산서원",
        "start": (36.5820, 128.5120), "end": (36.5380, 128.5850), "gain": 240, "loss": 230, "min_e": 70, "max_e": 220
    },
    {
        "id": 41, "region": "경북 안동시", "dist": 17.2,
        "course": "41구간 : 병산서원 ~ 낙동강변 자전거길 ~ 풍산읍 ~ 안동댐 월영교",
        "start": (36.5380, 128.5850), "end": (36.5780, 128.7450), "gain": 210, "loss": 220, "min_e": 80, "max_e": 190
    },
    {
        "id": 42, "region": "안동시, 영주시", "dist": 16.8,
        "course": "42구간 : 월영교 ~ 와룡면 ~ 도산서원 입구 ~ 영주시 평은면 영주호",
        "start": (36.5780, 128.7450), "end": (36.7120, 128.6950), "gain": 380, "loss": 340, "min_e": 120, "max_e": 360
    },
    {
        "id": 43, "region": "경북 영주시", "dist": 15.0,
        "course": "43구간 : 영주호 용혈폭포 ~ 문수면 무섬마을(외나무다리) ~ 서천수변공원",
        "start": (36.7120, 128.6950), "end": (36.8120, 128.6250), "gain": 180, "loss": 190, "min_e": 110, "max_e": 210
    },
    {
        "id": 44, "region": "경북 영주시", "dist": 16.2,
        "course": "44구간 : 영주시내 ~ 순흥면 소수서원 ~ 선비촌 ~ 부석사 입구",
        "start": (36.8120, 128.6250), "end": (36.9850, 128.6750), "gain": 390, "loss": 290, "min_e": 160, "max_e": 420
    },
    {
        "id": 45, "region": "영주시, 단양군", "dist": 15.6,
        "course": "45구간 : 부석사 ~ 백두대간 마구령(해발 820m) ~ 단양군 의풍1리",
        "start": (36.9850, 128.6750), "end": (37.0689, 128.6092), "gain": 680, "loss": 590, "min_e": 320, "max_e": 820
    }
]

def generate_interpolated_points(start_ll, end_ll, num_pts, base_ele, gain, loss):
    # Generates natural smooth track points bridging start and end
    pts = []
    lat0, lon0 = start_ll
    lat1, lon1 = end_ll
    for i in range(num_pts):
        t = i / float(num_pts - 1)
        # Add subtle natural curve
        curve = math.sin(t * math.pi) * 0.008
        lat = lat0 + (lat1 - lat0) * t + curve
        lon = lon0 + (lon1 - lon0) * t + curve * 0.5
        
        # Elevation profile simulation
        ele_var = math.sin(t * math.pi) * (gain * 0.5) - math.cos(t * math.pi * 2) * 15.0
        ele = max(10.0, base_ele + ele_var)
        
        # Distance approx
        dist = round(t * 15.0, 2)
        pts.append({
            "lat": round(lat, 6),
            "lng": round(lon, 6),
            "ele": round(ele, 1),
            "dist": dist
        })
    return pts

def main():
    print("Generating comprehensive 55 sections dataset...")
    
    # 1. Load existing 32 sections
    existing_sections = {}
    sections_dir = 'public/data/sections'
    for f in os.listdir(sections_dir):
        if f.startswith('section_') and f.endswith('.json'):
            sec_id = int(f.replace('section_', '').replace('.json', ''))
            with open(os.path.join(sections_dir, f), encoding='utf-8') as fp:
                existing_sections[sec_id] = json.load(fp)

    print(f"Loaded {len(existing_sections)} existing opened sections.")

    all_55_sections = []
    all_summary_list = []

    for sec_id in range(1, 56):
        if sec_id in existing_sections:
            sec = existing_sections[sec_id]
            sec['is_opened'] = True
            
            # Recalculate hiking time
            ht = calc_hiking_time(sec['official_distance_km'], sec['elevation_gain_m'], sec['elevation_loss_m'])
            sec['hiking_time_hours'] = ht['hiking_time_hours']
            sec['hiking_time_text'] = ht['hiking_time_text']
            
            # Save updated section file
            with open(os.path.join(sections_dir, f"section_{sec_id}.json"), 'w', encoding='utf-8') as fp:
                json.dump(sec, fp, ensure_ascii=False)
                
            all_summary_list.append({
                "section_id": sec['section_id'],
                "section_number": sec['section_number'],
                "title": sec['title'],
                "region": sec['region'],
                "course": sec['course'],
                "is_opened": True,
                "official_distance_km": sec['official_distance_km'],
                "actual_distance_km": sec.get('actual_distance_km', sec['official_distance_km']),
                "elevation_gain_m": sec['elevation_gain_m'],
                "elevation_loss_m": sec['elevation_loss_m'],
                "min_elevation_m": sec['min_elevation_m'],
                "max_elevation_m": sec['max_elevation_m'],
                "hiking_time_hours": sec['hiking_time_hours'],
                "hiking_time_text": sec['hiking_time_text'],
                "start_point": sec['start_point'],
                "end_point": sec['end_point'],
                "pois_count": len(sec.get('pois', [])),
                "points_count": len(sec.get('points', []))
            })
            all_55_sections.append(sec)
        else:
            # Generate unopened section
            u_def = next(u for u in UNOPENED_SECTIONS if u['id'] == sec_id)
            ht = calc_hiking_time(u_def['dist'], u_def['gain'], u_def['loss'])
            pts = generate_interpolated_points(u_def['start'], u_def['end'], 120, u_def['min_e'], u_def['gain'], u_def['loss'])
            
            sec_data = {
                "section_id": sec_id,
                "section_number": f"{sec_id}구간",
                "title": f"{sec_id}구간 ({u_def['region']})",
                "region": u_def['region'],
                "course": u_def['course'],
                "is_opened": False,
                "official_distance_km": u_def['dist'],
                "actual_distance_km": u_def['dist'],
                "elevation_gain_m": u_def['gain'],
                "elevation_loss_m": u_def['loss'],
                "min_elevation_m": u_def['min_e'],
                "max_elevation_m": u_def['max_e'],
                "hiking_time_hours": ht['hiking_time_hours'],
                "hiking_time_text": ht['hiking_time_text'],
                "start_point": {"lat": pts[0]["lat"], "lng": pts[0]["lng"]},
                "end_point": {"lat": pts[-1]["lat"], "lng": pts[-1]["lng"]},
                "pois": [
                    {
                        "name": f"{sec_id}구간 계획 거점 (미개통)",
                        "category": "cert_center",
                        "description": "동서트레일 공식 노선 조성 및 인프라 공사 진행 중인 구간입니다.",
                        "lat": pts[0]["lat"],
                        "lng": pts[0]["lng"],
                        "is_official": True
                    }
                ],
                "points_count": len(pts),
                "points": pts
            }
            
            with open(os.path.join(sections_dir, f"section_{sec_id}.json"), 'w', encoding='utf-8') as fp:
                json.dump(sec_data, fp, ensure_ascii=False)
                
            all_summary_list.append({
                "section_id": sec_data['section_id'],
                "section_number": sec_data['section_number'],
                "title": sec_data['title'],
                "region": sec_data['region'],
                "course": sec_data['course'],
                "is_opened": False,
                "official_distance_km": sec_data['official_distance_km'],
                "actual_distance_km": sec_data['actual_distance_km'],
                "elevation_gain_m": sec_data['elevation_gain_m'],
                "elevation_loss_m": sec_data['elevation_loss_m'],
                "min_elevation_m": sec_data['min_elevation_m'],
                "max_elevation_m": sec_data['max_elevation_m'],
                "hiking_time_hours": sec_data['hiking_time_hours'],
                "hiking_time_text": sec_data['hiking_time_text'],
                "start_point": sec_data['start_point'],
                "end_point": sec_data['end_point'],
                "pois_count": len(sec_data['pois']),
                "points_count": sec_data['points_count']
            })
            all_55_sections.append(sec_data)

    # Save summary of all 55 sections
    with open('public/data/sections_summary.json', 'w', encoding='utf-8') as fp:
        json.dump(all_summary_list, fp, ensure_ascii=False, indent=2)

    # Save lightweight nationwide overview dataset for AllSectionsMapView
    overview_dataset = []
    for s in all_55_sections:
        # Sample points every 3rd point for ultra-fast nationwide rendering
        sampled = s['points'][::2]
        overview_dataset.append({
            "section_id": s['section_id'],
            "section_number": s['section_number'],
            "title": s['title'],
            "region": s['region'],
            "is_opened": s['is_opened'],
            "distance_km": s['official_distance_km'],
            "start": s['start_point'],
            "end": s['end_point'],
            "path": [{"lat": p['lat'], "lng": p['lng']} for p in sampled]
        })

    with open('public/data/all_sections_overview.json', 'w', encoding='utf-8') as fp:
        json.dump(overview_dataset, fp, ensure_ascii=False)

    total_dist = sum(s['official_distance_km'] for s in all_summary_list)
    opened_dist = sum(s['official_distance_km'] for s in all_summary_list if s['is_opened'])
    unopened_dist = sum(s['official_distance_km'] for s in all_summary_list if not s['is_opened'])

    print(f"\nAll 55 sections successfully generated!")
    print(f"Total distance across 55 sections: {total_dist:.1f} km")
    print(f" - Opened (32 sections): {opened_dist:.1f} km")
    print(f" - Unopened (23 sections): {unopened_dist:.1f} km")

if __name__ == '__main__':
    main()
