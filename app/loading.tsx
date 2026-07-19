export default function Loading() {
    return (
        <div className="nemosine-loading-screen" role="status" aria-live="polite" aria-label="Preparando Nemosine">
            <div className="nemosine-loading-shell">
                <div className="nemosine-loading-sigil" aria-hidden="true">
                    <span className="nemosine-loading-ring nemosine-loading-ring-one" />
                    <span className="nemosine-loading-ring nemosine-loading-ring-two" />
                    <span className="nemosine-loading-axis nemosine-loading-axis-horizontal" />
                    <span className="nemosine-loading-axis nemosine-loading-axis-vertical" />
                    <span className="nemosine-loading-diamond" />
                </div>

                <div className="nemosine-loading-copy">
                    <p className="nemosine-loading-kicker">Nemosine Nous</p>
                    <p className="nemosine-loading-title">Abrindo o espaço mental</p>
                    <p className="nemosine-loading-subtitle">Sincronizando travessia e castelo...</p>
                </div>

                <div className="nemosine-loading-meter" aria-hidden="true">
                    <span />
                </div>
            </div>
        </div>
    );
}
