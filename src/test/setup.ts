import '@testing-library/jest-dom';
import { configureAxe } from 'jest-axe';

// Skip color-contrast: jsdom has no real CSS so contrast ratios are always 0
configureAxe({ rules: { 'color-contrast': { enabled: false } } });
