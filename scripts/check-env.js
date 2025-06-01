// Simple script to check if environment variables are accessible during build

console.log('Checking environment variables...');
console.log('NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// List all environment variables
console.log('\nAll environment variables:');
Object.keys(process.env).forEach(key => {
  console.log(`${key}: ${process.env[key]}`);
});

console.log('\nCheck complete!');
