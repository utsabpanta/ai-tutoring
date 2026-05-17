interface Props {
  mode: string | null;
}

export function ModeBanner({ mode }: Props): JSX.Element | null {
  if (!mode) return null;
  return <div className="mode-banner">{mode}</div>;
}
