# assets/images — Static Image Folder

Place all app images in this folder and update `src/constants/images.js` accordingly.

## Required Images

### App Branding
- `logo.png` — App logo (square, min 200×200)
- `splash_bg.png` — Splash screen background (full screen)

### User
- `avatar.png` — Default user avatar placeholder

### Trainers (file names must match)
- `trainer1.png` — Karan Mehta
- `trainer2.png` — Sneha Reddy
- `trainer3.png` — Rahul Desai
- `trainer4.png` — Anjali Nair

### Café Items
- `shake_whey.png`
- `shake_mass.png`
- `shake_green.png`
- `shake_mango.png`
- `meal_chicken.png`
- `meal_egg.png`
- `meal_paneer.png`
- `meal_tuna.png`
- `snack_proteinbar.png`
- `snack_makhana.png`
- `snack_egg.png`
- `supp_creatine.png`
- `supp_bcaa.png`
- `supp_preworkout.png`

## Usage in code

In `src/constants/images.js`, replace the placeholder URLs:
```js
// Replace:
trainer: { tr1: `${BASE_PLACEHOLDER}/...` }

// With:
trainer: { tr1: require('../../assets/images/trainer1.png') }
```
