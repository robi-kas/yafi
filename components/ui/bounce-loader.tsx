export default function BounceLoader() {
    return (
        <div className="flex h-screen w-full items-center justify-center space-x-2 bg-background">
            <div className="bg-primary h-5 w-5 animate-bounce rounded-full [animation-delay:-0.3s]"></div>
            <div className="bg-primary h-5 w-5 animate-bounce rounded-full [animation-delay:-0.13s]"></div>
            <div className="bg-primary h-5 w-5 animate-bounce rounded-full"></div>
        </div>
    );
}
