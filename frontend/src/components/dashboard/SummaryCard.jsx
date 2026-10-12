
const SummaryCard = ({
    icon,
    text,
    number,
    color = "primary",
    description
}) => {
    return (
        <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center gap-3">
                <div
                    className={`bg-${color} text-white rounded-3 d-flex align-items-center justify-content-center`}
                    style={{
                        width: "58px",
                        height: "58px",
                        fontSize: "24px",
                        flexShrink: 0
                    }}
                >
                    {icon}
                </div>

                <div className="min-w-0">
                    <p className="text-secondary mb-1">
                        {text}
                    </p>

                    <h3 className="fw-bold mb-1">
                        {number ?? "—"}
                    </h3>

                    {description && (
                        <small className="text-secondary">
                            {description}
                        </small>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SummaryCard;
