import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TagInput from './TagInput';

describe('TagInput', () => {
  it('adds a typed value once when the add button is used', () => {
    const onChange = vi.fn();

    render(<TagInput label="Sports" value={[]} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/Sports/), {
      target: { value: 'Athletics' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['Athletics']);
  });
});
