export const LAYER_GROUP_OPTIONS = [
  { value: 'district', label: 'Kecamatan' },
  { value: 'river', label: 'Sungai' },
  { value: 'photo', label: 'Foto Kondisi' },
  { value: 'administrative', label: 'Batas Administrasi' },
  { value: 'das', label: 'DAS' },
  { value: 'contour', label: 'Kontur' },
  { value: 'sumur_bor', label: 'Sumur Bor' },
  { value: 'mata_air', label: 'Mata Air' },
  { value: 'bendung', label: 'Bendung' },
  { value: 'reservoir', label: 'Reservoir' },
  { value: 'jaringan_air_bersih', label: 'Jaringan Air Bersih' },
  { value: 'sawah', label: 'Sawah' },
  { value: 'jaringan_irigasi', label: 'Jaringan Irigasi' },
];

export const LAYER_GROUP_LABELS = LAYER_GROUP_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});



