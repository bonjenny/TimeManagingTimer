import { render, act } from '@testing-library/react';
import OceanScene from '../../components/OceanScene';
import { savePaletteSettings } from '../../utils/colorPalette';

describe('OceanScene', () => {
  afterEach(() => savePaletteSettings({ type: 'navy-orange' }));

  it('바다 팔레트일 때만 배경이 깔리고, 팔레트를 바꾸면 바로 사라진다', () => {
    savePaletteSettings({ type: 'ocean' });
    render(<OceanScene />);
    expect(document.querySelector('[data-ocean-scene]')).not.toBeNull();

    act(() => savePaletteSettings({ type: 'navy-orange' }));
    expect(document.querySelector('[data-ocean-scene]')).toBeNull();
  });
});
