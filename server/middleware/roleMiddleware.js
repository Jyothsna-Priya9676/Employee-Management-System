
const VALID_ROLES = ["admin", "employee"];

const requireRole = (...allowedRoles) => {
    if (
        allowedRoles.length === 0 ||
        allowedRoles.some(role => !VALID_ROLES.includes(role))
    ) {
        throw new Error("Invalid role configuration in route");
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: "You do not have permission to perform this action"
            });
        }

        return next();
    };
};

export default requireRole;
