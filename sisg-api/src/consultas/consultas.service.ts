
import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';
import { IntegracionesService } from '../integraciones/integraciones.service.js';

type RolNombre = 'ADMINISTRADOR' | 'MEDICO' | 'HOSPITAL';

interface UsuarioAutenticado {
  usuarioId: number;
  email: string;
  rol: RolNombre;
  medicoId: number | null;
  hospitalId: number | null;
}

interface ConsultaAseguradora {
  codigo: string;
  totalConsultas: number | string;
  montoFacturado: number | string;
}

interface HospitalizacionAseguradora {
  codigo: string;
  totalHospitalizaciones: number | string;
  montoHospitalizaciones: number | string;
}

interface IndicadorConsulta {
  periodo: string;
  totalConsultas: number | string;
  facturacion: number | string;
}

interface IndicadorHospitalizacion {
  periodo: string;
  totalHospitalizaciones: number | string;
}

@Injectable()
export class ConsultasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly integracionesService: IntegracionesService,
  ) {}

  // Construir el filtro de seguridad según el usuario.
  // El alias debe ser c para consulta o h para hospitalizacion.
  private filtro(
    alias: 'c' | 'h',
    usuario: UsuarioAutenticado,
  ): { sql: string; params: number[] } {
    if (usuario.rol === 'ADMINISTRADOR') {
      return { sql: '', params: [] };
    }

    if (usuario.rol === 'MEDICO') {
      if (!usuario.medicoId) {
        throw new ForbiddenException(
          'La cuenta médica no tiene un médico asociado.',
        );
      }

      return {
        sql: ` AND ${alias}.medico_id = ?`,
        params: [usuario.medicoId],
      };
    }

    if (usuario.rol === 'HOSPITAL') {
      if (!usuario.hospitalId) {
        throw new ForbiddenException(
          'La cuenta del hospital no tiene una institución asociada.',
        );
      }

      return {
        sql: ` AND ${alias}.hospital_id = ?`,
        params: [usuario.hospitalId],
      };
    }

    throw new ForbiddenException('Rol no autorizado.');
  }

  // 1. RESUMEN GENERAL
  async obtenerResumen(usuario: UsuarioAutenticado) {
    const fc = this.filtro('c', usuario);
    const fh = this.filtro('h', usuario);

    const consultas = await this.dataSource.query(
      `
      SELECT
        COUNT(*) AS totalConsultas,
        COUNT(DISTINCT c.paciente_id) AS pacientesAtendidos,
        COUNT(DISTINCT c.medico_id) AS medicosParticipantes,
        COUNT(DISTINCT c.hospital_id) AS hospitalesParticipantes,
        COALESCE(SUM(c.monto_facturado), 0) AS totalFacturado,
        COALESCE(AVG(c.duracion_min), 0) AS duracionPromedio
      FROM consulta c
      WHERE 1 = 1 ${fc.sql}
      `,
      fc.params,
    );

    const hospitalizaciones = await this.dataSource.query(
      `
      SELECT
        COUNT(*) AS totalHospitalizaciones,
        COALESCE(SUM(h.fecha_egreso IS NULL), 0)
          AS pacientesHospitalizados,
        COALESCE(SUM(h.fecha_egreso IS NOT NULL), 0)
          AS pacientesEgresados,
        COALESCE(SUM(h.monto_facturado), 0)
          AS totalFacturadoHospitalizaciones
      FROM hospitalizacion h
      WHERE 1 = 1 ${fh.sql}
      `,
      fh.params,
    );

    const c = consultas[0];
    const h = hospitalizaciones[0];

    return {
      totalConsultas: Number(c.totalConsultas),
      pacientesAtendidos: Number(c.pacientesAtendidos),
      medicosParticipantes: Number(c.medicosParticipantes),
      hospitalesParticipantes: Number(c.hospitalesParticipantes),
      totalFacturado: Number(c.totalFacturado),
      duracionPromedio: Number(c.duracionPromedio),

      totalHospitalizaciones: Number(h.totalHospitalizaciones),
      pacientesHospitalizados: Number(h.pacientesHospitalizados),
      pacientesEgresados: Number(h.pacientesEgresados),
      totalFacturadoHospitalizaciones: Number(
        h.totalFacturadoHospitalizaciones,
      ),
    };
  }

  // 2. MÉDICOS Y PACIENTES
  async obtenerMedicosPacientes(usuario: UsuarioAutenticado) {
    const f = this.filtro('c', usuario);

    return this.dataSource.query(
      `
      SELECT
        m.medico_id AS medicoId,
        CONCAT(m.nombres, ' ', m.apellidos) AS medico,
        e.nombre AS especialidad,
        c.paciente_id AS pacienteId,
        COUNT(c.consulta_id) AS totalConsultas,
        MAX(c.fecha_hora) AS ultimaConsulta,
        COALESCE(SUM(c.monto_facturado), 0) AS montoFacturado
      FROM consulta c
      INNER JOIN medico m
        ON m.medico_id = c.medico_id
      LEFT JOIN especialidad e
        ON e.especialidad_id = m.especialidad_id
      WHERE 1 = 1 ${f.sql}
      GROUP BY
        m.medico_id,
        m.nombres,
        m.apellidos,
        e.nombre,
        c.paciente_id
      ORDER BY totalConsultas DESC
      `,
      f.params,
    );
  }

  // 3. HOSPITALES
  async obtenerHospitales(usuario: UsuarioAutenticado) {
    const fc = this.filtro('c', usuario);
    const fh = this.filtro('h', usuario);

    let filtroHospital = '';
    const parametrosHospital: number[] = [];

    if (usuario.rol === 'HOSPITAL') {
      if (!usuario.hospitalId) {
        throw new ForbiddenException(
          'La cuenta del hospital no tiene una institución asociada.',
        );
      }

      filtroHospital = ' WHERE h.hospital_id = ?';
      parametrosHospital.push(usuario.hospitalId);
    }

    return this.dataSource.query(
      `
      SELECT
        h.hospital_id AS hospitalId,
        h.nombre AS hospital,
        h.codigo_establecimiento AS codigo,
        h.activo,
        COALESCE(c.totalConsultas, 0) AS totalConsultas,
        COALESCE(c.totalPacientes, 0) AS totalPacientes,
        COALESCE(c.totalFacturado, 0) AS totalFacturado,
        COALESCE(ho.totalHospitalizaciones, 0)
          AS totalHospitalizaciones,
        COALESCE(ho.pacientesHospitalizados, 0)
          AS pacientesHospitalizados
      FROM hospital_privado h

      LEFT JOIN (
        SELECT
          c.hospital_id,
          COUNT(*) AS totalConsultas,
          COUNT(DISTINCT c.paciente_id) AS totalPacientes,
          SUM(c.monto_facturado) AS totalFacturado
        FROM consulta c
        WHERE 1 = 1 ${fc.sql}
        GROUP BY c.hospital_id
      ) c ON c.hospital_id = h.hospital_id

      LEFT JOIN (
        SELECT
          h.hospital_id,
          COUNT(*) AS totalHospitalizaciones,
          SUM(h.fecha_egreso IS NULL) AS pacientesHospitalizados
        FROM hospitalizacion h
        WHERE 1 = 1 ${fh.sql}
        GROUP BY h.hospital_id
      ) ho ON ho.hospital_id = h.hospital_id

      ${filtroHospital}
      ORDER BY totalConsultas DESC
      `,
      [...fc.params, ...fh.params, ...parametrosHospital],
    );
  }

  // 4. ASEGURADORAS
  async obtenerAseguradoras(usuario: UsuarioAutenticado) {
    const aseguradoras =
      this.integracionesService.obtenerAseguradoras();

    const consultas: ConsultaAseguradora[] =
      await this.dataSource.query(
        `
        SELECT
          c.codigo_aseguradora AS codigo,
          COUNT(*) AS totalConsultas,
          COALESCE(SUM(c.monto_facturado), 0) AS montoFacturado
        FROM consulta c
        WHERE c.codigo_aseguradora IS NOT NULL
        ${this.filtro('c', usuario).sql}
        GROUP BY c.codigo_aseguradora
        `,
        this.filtro('c', usuario).params,
      );

    const hospitalizaciones: HospitalizacionAseguradora[] =
      await this.dataSource.query(
        `
        SELECT
          h.codigo_aseguradora AS codigo,
          COUNT(*) AS totalHospitalizaciones,
          COALESCE(SUM(h.monto_facturado), 0)
            AS montoHospitalizaciones
        FROM hospitalizacion h
        WHERE h.codigo_aseguradora IS NOT NULL
        ${this.filtro('h', usuario).sql}
        GROUP BY h.codigo_aseguradora
        `,
        this.filtro('h', usuario).params,
      );

    // Los usuarios no administradores solo reciben aseguradoras
    // que aparecen en sus propios registros.
    const codigosVisibles = new Set([
      ...consultas.map((c) => c.codigo),
      ...hospitalizaciones.map((h) => h.codigo),
    ]);

    return aseguradoras
      .filter((aseguradora) =>
        usuario.rol === 'ADMINISTRADOR' ||
        codigosVisibles.has(aseguradora.codigo),
      )
      .map((aseguradora) => {
        const consulta = consultas.find(
          (c) => c.codigo === aseguradora.codigo,
        );

        const ingreso = hospitalizaciones.find(
          (h) => h.codigo === aseguradora.codigo,
        );

        return {
          ...aseguradora,
          totalConsultas: Number(
            consulta?.totalConsultas ?? 0,
          ),
          montoFacturado: Number(
            consulta?.montoFacturado ?? 0,
          ),
          totalHospitalizaciones: Number(
            ingreso?.totalHospitalizaciones ?? 0,
          ),
          montoHospitalizaciones: Number(
            ingreso?.montoHospitalizaciones ?? 0,
          ),
        };
      });
  }

  // 5. DIAGNÓSTICOS CIE-10
  async obtenerDiagnosticos(usuario: UsuarioAutenticado) {
    const f = this.filtro('c', usuario);

    return this.dataSource.query(
      `
      SELECT
        d.cie10_codigo AS codigo,
        d.descripcion,
        d.categoria,
        d.capitulo,
        COUNT(c.consulta_id) AS totalConsultas,
        COALESCE(
          SUM(cd.es_principal = 1),
          0
        ) AS diagnosticosPrincipales
      FROM diagnostico_catalogo d
      LEFT JOIN consulta_diagnostico cd
        ON cd.cie10_codigo = d.cie10_codigo
      LEFT JOIN consulta c
        ON c.consulta_id = cd.consulta_id
        ${f.sql ? `AND ${f.sql.trim().replace(/^AND /, '')}` : ''}
      GROUP BY
        d.cie10_codigo,
        d.descripcion,
        d.categoria,
        d.capitulo
      ORDER BY totalConsultas DESC
      `,
      f.params,
    );
  }

  // 6. INDICADORES MENSUALES
  async obtenerIndicadores(usuario: UsuarioAutenticado) {
    const fc = this.filtro('c', usuario);
    const fh = this.filtro('h', usuario);

    const consultas: IndicadorConsulta[] =
      await this.dataSource.query(
        `
        SELECT
          DATE_FORMAT(c.fecha_hora, '%Y-%m') AS periodo,
          COUNT(*) AS totalConsultas,
          COALESCE(SUM(c.monto_facturado), 0) AS facturacion
        FROM consulta c
        WHERE 1 = 1 ${fc.sql}
        GROUP BY DATE_FORMAT(c.fecha_hora, '%Y-%m')
        ORDER BY periodo ASC
        `,
        fc.params,
      );

    const hospitalizaciones: IndicadorHospitalizacion[] =
      await this.dataSource.query(
        `
        SELECT
          DATE_FORMAT(h.fecha_ingreso, '%Y-%m') AS periodo,
          COUNT(*) AS totalHospitalizaciones
        FROM hospitalizacion h
        WHERE 1 = 1 ${fh.sql}
        GROUP BY DATE_FORMAT(h.fecha_ingreso, '%Y-%m')
        ORDER BY periodo ASC
        `,
        fh.params,
      );

    return {
      consultas: consultas.map((r) => ({
        ...r,
        totalConsultas: Number(r.totalConsultas),
        facturacion: Number(r.facturacion),
      })),

      hospitalizaciones: hospitalizaciones.map((r) => ({
        ...r,
        totalHospitalizaciones: Number(
          r.totalHospitalizaciones,
        ),
      })),
    };
  }
}
