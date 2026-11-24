
export interface Aseguradora {
  aseguradoraId: number;
  codigo: string;
  nombre: string;
  telefono: string;
  correo: string;
  estado: 'ACTIVA' | 'INACTIVA';
}

export interface HospitalAfiliado {
  hospitalId: number;
  aseguradoraId: number;
  codigoHospital: string;
  nombreHospital: string;
  cobertura: string;
  porcentajeCobertura: number;
  estadoAfiliacion: 'ACTIVA' | 'INACTIVA';
}

// Datos ficticios del sistema externo de aseguradoras
export const aseguradorasSimuladas: Aseguradora[] = [
  {
    aseguradoraId: 1,
    codigo: 'ASEG-001',
    nombre: 'Aseguradora General',
    telefono: '2200-0000',
    correo: 'contacto@aseguradora-demo.com',
    estado: 'ACTIVA',
  },
  {
    aseguradoraId: 2,
    codigo: 'ASEG-002',
    nombre: 'Seguros Universales',
    telefono: '2300-0000',
    correo: 'contacto@seguros-demo.com',
    estado: 'ACTIVA',
  },
  {
    aseguradoraId: 3,
    codigo: 'ASEG-003',
    nombre: 'Aseguradora Nacional',
    telefono: '2400-0000',
    correo: 'info@nacional-demo.com',
    estado: 'ACTIVA',
  },
  {
    aseguradoraId: 4,
    codigo: 'ASEG-004',
    nombre: 'Seguros Vida Integral',
    telefono: '2500-1000',
    correo: 'contacto@vidaintegral-demo.com',
    estado: 'ACTIVA',
  },
  {
    aseguradoraId: 5,
    codigo: 'ASEG-005',
    nombre: 'Protección Médica Guatemala',
    telefono: '2500-2000',
    correo: 'info@proteccionmedica-demo.com',
    estado: 'ACTIVA',
  },
  {
    aseguradoraId: 6,
    codigo: 'ASEG-006',
    nombre: 'Seguros Salud Plus',
    telefono: '2500-3000',
    correo: 'contacto@saludplus-demo.com',
    estado: 'ACTIVA',
  },
  {
    aseguradoraId: 7,
    codigo: 'ASEG-007',
    nombre: 'Aseguradora Bienestar',
    telefono: '2500-4000',
    correo: 'info@bienestar-demo.com',
    estado: 'ACTIVA',
  },
  {
    aseguradoraId: 8,
    codigo: 'ASEG-008',
    nombre: 'Cobertura Médica Nacional',
    telefono: '2500-5000',
    correo: 'contacto@coberturanacional-demo.com',
    estado: 'INACTIVA',
  },
];

// Hospitales relacionados con las aseguradoras.
// Se reutilizan los IDs 6, 7 y 8 del ejemplo original.
// Verifica que correspondan a hospitales registrados en SISG.
export const hospitalesAfiliadosSimulados: HospitalAfiliado[] = [
  {
    hospitalId: 6,
    aseguradoraId: 1,
    codigoHospital: 'SISG-HOSP-001',
    nombreHospital: 'Hospital Centro Médico',
    cobertura: 'Plan médico integral',
    porcentajeCobertura: 80,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 7,
    aseguradoraId: 2,
    codigoHospital: 'SISG-HOSP-002',
    nombreHospital: 'Hospital Universitario Esperanza',
    cobertura: 'Plan hospitalario',
    porcentajeCobertura: 90,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 8,
    aseguradoraId: 1,
    codigoHospital: 'SISG-HOSP-003',
    nombreHospital: 'Hospital Maranatha',
    cobertura: 'Plan básico',
    porcentajeCobertura: 70,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 6,
    aseguradoraId: 3,
    codigoHospital: 'SISG-HOSP-001',
    nombreHospital: 'Hospital Centro Médico',
    cobertura: 'Cobertura hospitalaria general',
    porcentajeCobertura: 75,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 7,
    aseguradoraId: 4,
    codigoHospital: 'SISG-HOSP-002',
    nombreHospital: 'Hospital Universitario Esperanza',
    cobertura: 'Plan de salud integral',
    porcentajeCobertura: 85,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 8,
    aseguradoraId: 4,
    codigoHospital: 'SISG-HOSP-003',
    nombreHospital: 'Hospital Maranatha',
    cobertura: 'Plan familiar',
    porcentajeCobertura: 70,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 6,
    aseguradoraId: 5,
    codigoHospital: 'SISG-HOSP-001',
    nombreHospital: 'Hospital Centro Médico',
    cobertura: 'Protección médica completa',
    porcentajeCobertura: 90,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 7,
    aseguradoraId: 5,
    codigoHospital: 'SISG-HOSP-002',
    nombreHospital: 'Hospital Universitario Esperanza',
    cobertura: 'Cobertura de emergencias',
    porcentajeCobertura: 80,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 8,
    aseguradoraId: 6,
    codigoHospital: 'SISG-HOSP-003',
    nombreHospital: 'Hospital Maranatha',
    cobertura: 'Plan de especialidades',
    porcentajeCobertura: 95,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 6,
    aseguradoraId: 6,
    codigoHospital: 'SISG-HOSP-001',
    nombreHospital: 'Hospital Centro Médico',
    cobertura: 'Plan médico premium',
    porcentajeCobertura: 85,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 7,
    aseguradoraId: 7,
    codigoHospital: 'SISG-HOSP-002',
    nombreHospital: 'Hospital Universitario Esperanza',
    cobertura: 'Plan de bienestar familiar',
    porcentajeCobertura: 80,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 8,
    aseguradoraId: 7,
    codigoHospital: 'SISG-HOSP-003',
    nombreHospital: 'Hospital Maranatha',
    cobertura: 'Plan de hospitalización',
    porcentajeCobertura: 75,
    estadoAfiliacion: 'ACTIVA',
  },
  {
    hospitalId: 6,
    aseguradoraId: 8,
    codigoHospital: 'SISG-HOSP-001',
    nombreHospital: 'Hospital Centro Médico',
    cobertura: 'Plan nacional de cobertura',
    porcentajeCobertura: 65,
    estadoAfiliacion: 'INACTIVA',
  },
];
