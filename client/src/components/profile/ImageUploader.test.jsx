import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ImageUploader from './ImageUploader';

describe('ImageUploader', () => {
  it('offers a clear action when a profile photo is present', () => {
    const onClear = vi.fn();

    render(
      <ImageUploader
        name="Alex Runner"
        label="Profile photo"
        imageUrl="https://example.com/avatar.jpg"
        onFile={vi.fn()}
        onClear={onClear}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));

    expect(onClear).toHaveBeenCalledOnce();
  });

  it('labels the clear action for cover images and hides it when empty', () => {
    const { rerender } = render(
      <ImageUploader
        name="Alex Runner"
        label="Cover image"
        imageUrl="https://example.com/cover.jpg"
        onFile={vi.fn()}
        onClear={vi.fn()}
        variant="cover"
      />,
    );

    expect(screen.getByRole('button', { name: 'Remove cover' })).toBeInTheDocument();

    rerender(
      <ImageUploader
        name="Alex Runner"
        label="Cover image"
        onFile={vi.fn()}
        onClear={vi.fn()}
        variant="cover"
      />,
    );

    expect(screen.queryByRole('button', { name: 'Remove cover' })).not.toBeInTheDocument();
  });
});
