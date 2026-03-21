import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoInput } from '../components/RepoInput';

describe('RepoInput', () => {
  it('renders input and button', () => {
    render(<RepoInput onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByPlaceholderText('owner/repo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ANALYSE/i })).toBeInTheDocument();
  });

  it('shows validation error for invalid format', async () => {
    render(<RepoInput onSubmit={vi.fn()} isLoading={false} />);
    const input = screen.getByPlaceholderText('owner/repo');
    await userEvent.clear(input);
    await userEvent.type(input, 'notarepo');
    await userEvent.click(screen.getByRole('button', { name: /ANALYSE/i }));
    expect(screen.getByText(/Use owner\/repo format/i)).toBeInTheDocument();
  });

  it('calls onSubmit with repo and days on valid input', async () => {
    const onSubmit = vi.fn();
    render(<RepoInput onSubmit={onSubmit} isLoading={false} />);
    const input = screen.getByPlaceholderText('owner/repo');
    await userEvent.clear(input);
    await userEvent.type(input, 'suryach24/portfolio');
    await userEvent.click(screen.getByRole('button', { name: /ANALYSE/i }));
    expect(onSubmit).toHaveBeenCalledWith('suryach24/portfolio', 90);
  });

  it('disables button while loading', () => {
    render(<RepoInput onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
