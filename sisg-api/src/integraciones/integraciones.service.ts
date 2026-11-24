
import { Injectable } from '@nestjs/common';

@Injectable()
export class IntegracionesService {
  private readonly aseguradoras = [
    {
      aseguradoraId: 1,
      codigo: 'ASEG-001',
      nombre: 'Seguros G&T',
      tipo: 'Privada',
      telefono: '2338-5000',
      email: 'contacto@gyt.com.gt',
      estado: 'Activa',
    },
    {
      aseguradoraId: 2,
      codigo: 'ASEG-002',
      nombre: 'Seguros El Roble',
      tipo: 'Privada',
      telefono: '2420-0000',
      email: 'contacto@elroble.com',
      estado: 'Activa',
    },
    {
      aseguradoraId: 3,
      codigo: 'ASEG-003',
      nombre: 'Aseguradora General',
      tipo: 'Privada',
      telefono: '2279-5000',
      email: 'info@aseguradorageneral.com',
      estado: 'Activa',
    },
    {
      aseguradoraId: 4,
      codigo: 'ASEG-004',
      nombre: 'MAPFRE Guatemala',
      tipo: 'Privada',
      telefono: '2328-5000',
      email: 'servicio@mapfre.com.gt',
      estado: 'Activa',
    },
    {
      aseguradoraId: 5,
      codigo: 'ASEG-005',
      nombre: 'Seguros Universales',
      tipo: 'Privada',
      telefono: '2338-9000',
      email: 'info@universales.com',
      estado: 'Activa',
    },
    {
      aseguradoraId: 6,
      codigo: 'ASEG-006',
      nombre: 'BMI Guatemala',
      tipo: 'Privada',
      telefono: '2385-7000',
      email: 'info@bmicos.com',
      estado: 'Activa',
    },
  ];

  private readonly hospitalesAfiliados = [
    {
      afiliacionId: 1,
      aseguradoraId: 1,
      aseguradoraCodigo: 'ASEG-001',
      hospitalId: 1,
      hospitalCodigo: 'HOSP-001',
      hospitalNombre: 'Hospital Centro Médico',
      cobertura: 'Cobertura hospitalaria',
      porcentajeCobertura: 85,
      estado: 'Activa',
    },
    {
      afiliacionId: 2,
      aseguradoraId: 1,
      aseguradoraCodigo: 'ASEG-001',
      hospitalId: 2,
      hospitalCodigo: 'HOSP-002',
      hospitalNombre: 'Hospital Herrera Llerandi',
      cobertura: 'Cobertura hospitalaria',
      porcentajeCobertura: 80,
      estado: 'Activa',
    },
    {
      afiliacionId: 3,
      aseguradoraId: 2,
      aseguradoraCodigo: 'ASEG-002',
      hospitalId: 3,
      hospitalCodigo: 'HOSP-003',
      hospitalNombre: 'Hospital El Pilar',
      cobertura: 'Cobertura hospitalaria',
      porcentajeCobertura: 90,
      estado: 'Activa',
    },
    {
      afiliacionId: 4,
      aseguradoraId: 2,
      aseguradoraCodigo: 'ASEG-002',
      hospitalId: 4,
      hospitalCodigo: 'HOSP-004',
      hospitalNombre: 'Hospital Multimédica',
      cobertura: 'Cobertura hospitalaria',
      porcentajeCobertura: 75,
      estado: 'Activa',
    },
    {
      afiliacionId: 5,
      aseguradoraId: 3,
      aseguradoraCodigo: 'ASEG-003',
      hospitalId: 1,
      hospitalCodigo: 'HOSP-001',
      hospitalNombre: 'Hospital Centro Médico',
      cobertura: 'Cobertura hospitalaria',
      porcentajeCobertura: 80,
      estado: 'Activa',
    },
    {
      afiliacionId: 6,
      aseguradoraId: 4,
      aseguradoraCodigo: 'ASEG-004',
      hospitalId: 5,
      hospitalCodigo: 'HOSP-005',
      hospitalNombre: 'Hospital La Paz',
      cobertura: 'Cobertura hospitalaria',
      porcentajeCobertura: 95,
      estado: 'Activa',
    },
    {
      afiliacionId: 7,
      aseguradoraId: 5,
      aseguradoraCodigo: 'ASEG-005',
      hospitalId: 3,
      hospitalCodigo: 'HOSP-003',
      hospitalNombre: 'Hospital El Pilar',
      cobertura: 'Cobertura hospitalaria',
      porcentajeCobertura: 85,
      estado: 'Activa',
    },
    {
      afiliacionId: 8,
      aseguradoraId: 6,
      aseguradoraCodigo: 'ASEG-006',
      hospitalId: 2,
      hospitalCodigo: 'HOSP-002',
      hospitalNombre: 'Hospital Herrera Llerandi',
      cobertura: 'Cobertura hospitalaria',
      porcentajeCobertura: 70,
      estado: 'Inactiva',
    },
  ];

  obtenerAseguradoras() {
    return this.aseguradoras;
  }

  obtenerHospitalesAfiliados() {
    return this.hospitalesAfiliados;
  }

  obtenerResumen() {
    return {
      totalAseguradoras: this.aseguradoras.length,
      aseguradorasActivas: this.aseguradoras.filter(
        (a) => a.estado === 'Activa',
      ).length,
      totalAfiliaciones: this.hospitalesAfiliados.length,
      afiliacionesActivas: this.hospitalesAfiliados.filter(
        (h) => h.estado === 'Activa',
      ).length,
      afiliacionesInactivas: this.hospitalesAfiliados.filter(
        (h) => h.estado === 'Inactiva',
      ).length,
      porcentajePromedioCobertura:
        this.hospitalesAfiliados
          .filter((h) => h.estado === 'Activa')
          .reduce((total, h) => total + h.porcentajeCobertura, 0) /
        Math.max(
          1,
          this.hospitalesAfiliados.filter(
            (h) => h.estado === 'Activa',
          ).length,
        ),
    };
  }
}
