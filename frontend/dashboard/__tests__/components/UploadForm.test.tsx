/**
 * @module UploadForm.test
 * @description Tests for UploadForm component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadForm from '../../components/UploadForm';
import { ApiClient } from '../../lib/api';

jest.mock('../../lib/api');

describe('UploadForm', () => {
  const mockApiKey = 'wtr_live_test123';
  const mockOnUploadComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render upload form', () => {
    render(<UploadForm apiKey={mockApiKey} />);

    expect(screen.getByText(/Upload & Transcribe/i)).toBeInTheDocument();
    expect(screen.getByText(/Click to upload/i)).toBeInTheDocument();
  });

  it('should show file after selection', async () => {
    render(<UploadForm apiKey={mockApiKey} />);

    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText(/Audio\/Video File/i);

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('test.mp3')).toBeInTheDocument();
    });
  });

  it('should disable submit button when no file selected', () => {
    render(<UploadForm apiKey={mockApiKey} />);

    const submitButton = screen.getByRole('button', { name: /Upload & Transcribe/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when file is selected', async () => {
    render(<UploadForm apiKey={mockApiKey} />);

    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText(/Audio\/Video File/i);

    await userEvent.upload(input, file);

    const submitButton = screen.getByRole('button', { name: /Upload & Transcribe/i });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should call transcribe API on submit', async () => {
    const mockTranscribe = jest.fn().mockResolvedValue('trans_123');
    (ApiClient as jest.Mock).mockImplementation(() => ({
      transcribe: mockTranscribe,
    }));

    render(
      <UploadForm
        apiKey={mockApiKey}
        onUploadComplete={mockOnUploadComplete}
      />
    );

    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText(/Audio\/Video File/i);

    await userEvent.upload(input, file);

    const submitButton = screen.getByRole('button', { name: /Upload & Transcribe/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockTranscribe).toHaveBeenCalledWith(file, 'BASE', 'JSON');
    });

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith('trans_123');
    });
  });

  it('should show error on upload failure', async () => {
    const mockTranscribe = jest.fn().mockRejectedValue(new Error('Upload failed'));
    (ApiClient as jest.Mock).mockImplementation(() => ({
      transcribe: mockTranscribe,
    }));

    render(
      <UploadForm
        apiKey={mockApiKey}
        onError={mockOnError}
      />
    );

    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText(/Audio\/Video File/i);

    await userEvent.upload(input, file);

    const submitButton = screen.getByRole('button', { name: /Upload & Transcribe/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
    });

    expect(mockOnError).toHaveBeenCalled();
  });

  it('should allow model selection', () => {
    render(<UploadForm apiKey={mockApiKey} />);

    const modelSelect = screen.getByLabelText(/Whisper Model/i);
    expect(modelSelect).toBeInTheDocument();

    fireEvent.change(modelSelect, { target: { value: 'MEDIUM' } });
    expect(modelSelect).toHaveValue('MEDIUM');
  });

  it('should allow format selection', () => {
    render(<UploadForm apiKey={mockApiKey} />);

    const formatSelect = screen.getByLabelText(/Output Format/i);
    expect(formatSelect).toBeInTheDocument();

    fireEvent.change(formatSelect, { target: { value: 'SRT' } });
    expect(formatSelect).toHaveValue('SRT');
  });

  it('should remove file when remove button clicked', async () => {
    render(<UploadForm apiKey={mockApiKey} />);

    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText(/Audio\/Video File/i);

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('test.mp3')).toBeInTheDocument();
    });

    const removeButton = screen.getByRole('button', { name: '' }); // SVG button
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('test.mp3')).not.toBeInTheDocument();
    });
  });
});
