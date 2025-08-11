# 이미지 추가 가이드

## 캐릭터 이미지 활용 방법

### 1. 파일 위치
주신 귀여운 운동 캐릭터 이미지들을 다음 위치에 저장하세요:

```
public/
├── character-muscle.png     (근육 캐릭터)
├── character-dumbbell.png   (덤벨 캐릭터)
└── character-bg.png         (배경용 패턴, 선택사항)
```

### 2. CSS에서 이미지 활용하기

이미지를 저장한 후, `src/index.css`에 다음 스타일을 추가하면 됩니다:

```css
/* 헤더에 캐릭터 배경 */
.workout-character {
  background-image: url('/character-muscle.png');
  background-size: 24px 24px;
  background-repeat: no-repeat;
  background-position: right top;
  padding-right: 30px;
}

/* 운동 카드에 캐릭터 장식 */
.card.workout-item {
  background-image: url('/character-dumbbell.png');
  background-size: 40px 40px;
  background-repeat: no-repeat;
  background-position: bottom right 10px;
}

/* 로그인 페이지 배경 */
.login-background {
  background-image: url('/character-muscle.png'), url('/character-dumbbell.png');
  background-size: 80px 80px, 60px 60px;
  background-position: top left 20px, bottom right 20px;
  background-repeat: no-repeat;
}
```

### 3. React 컴포넌트에서 직접 사용

```tsx
// 컴포넌트 내에서
<img src="/character-muscle.png" alt="근육 캐릭터" className="w-8 h-8" />

// 배경으로
<div 
  style={{
    backgroundImage: 'url(/character-muscle.png)',
    backgroundSize: '50px 50px',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center'
  }}
>
  콘텐츠
</div>
```

### 4. 애니메이션 효과 추가

```css
.character-bounce {
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
```

### 5. 적용 순서

1. 이미지 파일들을 `public/` 폴더에 저장
2. 위 CSS 스타일을 `src/index.css`에 추가
3. 원하는 컴포넌트에 클래스명 적용
4. `npm run dev`로 확인

이렇게 하면 귀여운 캐릭터들이 앱 전체에 자연스럽게 녹아듭니다! 🎨✨
