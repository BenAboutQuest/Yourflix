// Ultra simple page with inline JavaScript
export default function UltraSimplePage() {
  return (
    <div>
      <h1>Ultra Simple Test</h1>
      <button 
        onClick={() => {
          document.body.style.backgroundColor = 'red';
          console.log('BUTTON CLICKED - JavaScript is working!');
        }}
      >
        Click me to turn page red
      </button>
      <script dangerouslySetInnerHTML={{
        __html: `
          console.log('INLINE SCRIPT LOADED');
          window.addEventListener('load', function() {
            console.log('WINDOW LOADED');
          });
        `
      }} />
    </div>
  );
}