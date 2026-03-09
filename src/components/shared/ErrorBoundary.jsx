import React from 'react';
import { Link } from 'react-router';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                    <h2>Oops, something went wrong.</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>{this.state.error?.message}</p>
                    <Link to="/home" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>Return Home</Link>
                </div>
            );
        }

        return this.props.children;
    }
}
