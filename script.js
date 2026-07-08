document.addEventListener("DOMContentLoaded", () => {
    const tipoPeriodo = document.getElementById("tipoPeriodo");
    const labelSalario = document.getElementById("labelSalario");
    const labelFechaSalida = document.getElementById("labelFechaSalida");
    const motivoSalida = document.getElementById("motivoSalida");
    const btnCalcular = document.getElementById("btnCalcular");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const emptyState = document.getElementById("emptyState");
    const resultsContent = document.getElementById("resultsContent");
    
    let chartInstance = null;

    tipoPeriodo.addEventListener("change", () => {
        const p = tipoPeriodo.value;
        if(p === "mensual") labelSalario.innerHTML = `<i class="fa-solid fa-money-bill-wave"></i> Salario Bruto Mensual (MXN)`;
        if(p === "quincenal") labelSalario.innerHTML = `<i class="fa-solid fa-money-bill-wave"></i> Salario Bruto Quincenal (MXN)`;
        if(p === "catorcenal") labelSalario.innerHTML = `<i class="fa-solid fa-money-bill-wave"></i> Salario Bruto Catorcenal (MXN)`;
    });

    // Detectar cuando cambia a Trabajador Activo para ajustar los textos del formulario al instante
    motivoSalida.addEventListener("change", () => {
        if(motivoSalida.value === "activo") {
            labelFechaSalida.innerHTML = `<i class="fa-solid fa-calendar-check"></i> Fecha de Corte / Consulta`;
        } else {
            labelFechaSalida.innerHTML = `<i class="fa-solid fa-calendar-minus"></i> Fecha de Salida`;
        }
    });

    btnCalcular.addEventListener("click", calcularTodo);
    btnLimpiar.addEventListener("click", limpiarFormulario);

    function calcularTodo() {
        const nombre = document.getElementById("nombre").value || "Colaborador";
        const fIngreso = new Date(document.getElementById("fechaIngreso").value + "T00:00:00");
        const fSalida = new Date(document.getElementById("fechaSalida").value + "T00:00:00");
        const montoInput = parseFloat(document.getElementById("salarioInput").value) || 0;
        const periodo = tipoPeriodo.value;
        const motivo = motivoSalida.value;
        const diasVencidosInput = parseInt(document.getElementById("vacacionesPendientes").value) || 0;
        const aguinaldoBaseInput = parseInt(document.getElementById("diasAguinaldoBase").value) || 15;

        if (isNaN(fIngreso.getTime()) || isNaN(fSalida.getTime())) {
            alert("Por favor, introduce fechas válidas.");
            return;
        }
        if (fSalida < fIngreso) {
            alert("La fecha de corte o salida no puede ser menor a la de ingreso.");
            return;
        }

        let salarioDiario = 0;
        if (periodo === "mensual") salarioDiario = montoInput / 30;
        else if (periodo === "quincenal") salarioDiario = montoInput / 15;
        else if (periodo === "catorcenal") salarioDiario = montoInput / 14;

        const msPorDia = 24 * 60 * 60 * 1000;
        const totalDiasTranscurridos = Math.round((fSalida - fIngreso) / msPorDia) + 1;

        let anios = fSalida.getFullYear() - fIngreso.getFullYear();
        let meses = fSalida.getMonth() - fIngreso.getMonth();
        let dias = fSalida.getDate() - fIngreso.getDate() + 1;
        if (dias < 0) { meses--; const ult = new Date(fSalida.getFullYear(), fSalida.getMonth(), 0).getDate(); dias += ult; }
        if (meses < 0) { anios--; meses += 12; }

        let antiguedadAniosExactos = totalDiasTranscurridos / 365;

        // TABLA DINÁMICA DE VACACIONES COMPLETA LFT
        let diasQueCorresponden = 12;
        if (antiguedadAniosExactos >= 1 && antiguedadAniosExactos < 2) diasQueCorresponden = 12;
        else if (antiguedadAniosExactos >= 2 && antiguedadAniosExactos < 3) diasQueCorresponden = 14;
        else if (antiguedadAniosExactos >= 3 && antiguedadAniosExactos < 4) diasQueCorresponden = 16;
        else if (antiguedadAniosExactos >= 4 && antiguedadAniosExactos < 5) diasQueCorresponden = 18;
        else if (antiguedadAniosExactos >= 5 && antiguedadAniosExactos < 11) diasQueCorresponden = 20;
        else if (antiguedadAniosExactos >= 11 && antiguedadAniosExactos < 16) diasQueCorresponden = 22;
        else if (antiguedadAniosExactos >= 16 && antiguedadAniosExactos < 21) diasQueCorresponden = 24;
        else if (antiguedadAniosExactos >= 21 && antiguedadAniosExactos < 26) diasQueCorresponden = 26;
        else if (antiguedadAniosExactos >= 26 && antiguedadAniosExactos < 31) diasQueCorresponden = 28;
        else if (antiguedadAniosExactos >= 31 && antiguedadAniosExactos < 36) diasQueCorresponden = 30;
        else if (antiguedadAniosExactos >= 36) diasQueCorresponden = 32;

        // 1. Vacaciones Proporcionales / Acumuladas
        let factorVacaciones = diasQueCorresponden / 365;
        let diasVacProporcionalesNoRedondeado = factorVacaciones * totalDiasTranscurridos; 
        let diasVacProporcionales = Math.round(diasVacProporcionalesNoRedondeado); 

        let montoVacacionesProp = diasVacProporcionales * salarioDiario; 
        let montoVacacionesVencidas = diasVencidosInput * salarioDiario;

        // FÓRMULA DEL PINTARRÓN: Días correspondientes según la tabla de antigüedad × SD × 0.25
        let montoPrimaVacacional = diasQueCorresponden * salarioDiario * 0.25;

        // 2. Aguinaldo Proporcional / Acumulado
        let factorAguinaldoFijo = aguinaldoBaseInput / 365; 
        let diasAguinaldoProp = factorAguinaldoFijo * totalDiasTranscurridos; 
        let montoAguinaldo = diasAguinaldoProp * salarioDiario; 

        let subtotalBase = montoVacacionesProp + montoVacacionesVencidas + montoPrimaVacacional + montoAguinaldo;
        let granTotalFinal = subtotalBase;

        // Etiquetas base para la gráfica de dona
        let labelsGrafica = ['Vacaciones', 'Prima Vacacional', 'Aguinaldo'];
        let datosGrafica = [montoVacacionesProp, montoPrimaVacacional, montoAguinaldo];
        let coloresGrafica = ['#38bdf8', '#fbbf24', '#f43f5e'];

        if (diasVencidosInput > 0) {
            labelsGrafica.push('Vacaciones Vencidas');
            datosGrafica.push(montoVacacionesVencidas);
            coloresGrafica.push('#a855f7');
        }

        // CAMBIO ESTRATÉGICO DE TEXTOS SEGÚN EL MODO (DESPIDO / ACTIVO / RENUNCIA)
        if (motivo === "activo") {
            document.getElementById("tituloResultadosPrincipal").innerHTML = `<i class="fa-solid fa-eye"></i> Consulta de Prestaciones Vigentes`;
            document.getElementById("badgeTipoConcepto").innerText = "Trabajador Activo";
            document.getElementById("labelGranTotal").innerText = "TOTAL ACUMULADO VIGENTE";
            document.getElementById("tituloSeccionPrestaciones").innerText = "Prestaciones acumuladas a la fecha";
            document.getElementById("lblAntiguedad").innerText = "Tiempo Laborado:";
            document.getElementById("lblVacacionesTexto").innerHTML = `<i class="fa-solid fa-plane"></i> Vacaciones Generadas (Al corte)`;
            document.getElementById("lblAguinaldoTexto").innerHTML = `<i class="fa-solid fa-gift"></i> Aguinaldo Acumulado`;
            document.getElementById("bloqueLiquidacion").style.display = "none";
            
            document.getElementById("legalText").innerText = "Consulta informativa para empleados activos. Refleja los derechos mínimos vigentes acumulados por ley en Vacaciones (Art. 76), Prima Vacacional (Art. 80) y Aguinaldo (Art. 87) sin simular terminación de contrato.";
        } 
        else if (motivo === "despido") {
            document.getElementById("tituloResultadosPrincipal").innerHTML = `<i class="fa-solid fa-file-invoice-dollar"></i> Desglose de Prestaciones`;
            document.getElementById("badgeTipoConcepto").innerText = "Liquidación de Ley";
            document.getElementById("labelGranTotal").innerText = "TOTAL LIQUIDACIÓN NETO ESTIMADO";
            document.getElementById("tituloSeccionPrestaciones").innerText = "Prestaciones Devengadas (Finiquito)";
            document.getElementById("lblAntiguedad").innerText = "Antigüedad Real:";
            document.getElementById("lblVacacionesTexto").innerHTML = `<i class="fa-solid fa-plane"></i> Vacaciones Proporcionales (Redondeado)`;
            document.getElementById("lblAguinaldoTexto").innerHTML = `<i class="fa-solid fa-gift"></i> Aguinaldo Proporcional`;
            document.getElementById("bloqueLiquidacion").style.display = "block";

            let montoTresMeses = salarioDiario * 30 * 3;
            let montoVeinteDias = (salarioDiario * 20) * antiguedadAniosExactos;
            let montoPrimaAntiguedad = (salarioDiario * 12) * antiguedadAniosExactos;

            granTotalFinal += (montoTresMeses + montoVeinteDias + montoPrimaAntiguedad);

            labelsGrafica.push('Indemnización 3 Meses', '20 Días por Año', 'Prima Antigüedad');
            datosGrafica.push(montoTresMeses, montoVeinteDias, montoPrimaAntiguedad);
            coloresGrafica.push('#10b981', '#f97316', '#64748b');

            document.getElementById("valTresMeses").innerText = formatMoneda(montoTresMeses);
            document.getElementById("procTresMeses").innerHTML = `<strong>Art. 48 LFT:</strong> 90 días × $${salarioDiario.toFixed(2)}<div>= $${montoTresMeses.toFixed(2)}</div>`;

            document.getElementById("valVeinteDias").innerText = formatMoneda(montoVeinteDias);
            document.getElementById("procVeinteDias").innerHTML = `<strong>Art. 50 LFT:</strong> 20 días por año × ${(antiguedadAniosExactos).toFixed(2)} años<div>= $${montoVeinteDias.toFixed(2)}</div>`;

            document.getElementById("valPrimaAntiguedad").innerText = formatMoneda(montoPrimaAntiguedad);
            document.getElementById("procPrimaAntiguedad").innerHTML = `<strong>Art. 162 LFT:</strong> 12 días por año × ${(antiguedadAniosExactos).toFixed(2)} años<div>= $${montoPrimaAntiguedad.toFixed(2)}</div>`;

            document.getElementById("legalText").innerText = "Al tratarse de un Despido Injustificado, corresponde Finiquito base (Arts. 76, 80 y 87) más la Indemnización Constitucional (Art. 48), 20 días por año (Art. 50) y Prima de Antigüedad (Art. 162).";
        } 
        else {
            document.getElementById("tituloResultadosPrincipal").innerHTML = `<i class="fa-solid fa-file-invoice-dollar"></i> Desglose de Prestaciones`;
            document.getElementById("badgeTipoConcepto").innerText = "Finiquito Estimado";
            document.getElementById("labelGranTotal").innerText = "TOTAL FINIQUITO NETO ESTIMADO";
            document.getElementById("tituloSeccionPrestaciones").innerText = "Prestaciones Devengadas (Finiquito)";
            document.getElementById("lblAntiguedad").innerText = "Antigüedad Real:";
            document.getElementById("lblVacacionesTexto").innerHTML = `<i class="fa-solid fa-plane"></i> Vacaciones Proporcionales (Redondeado)`;
            document.getElementById("lblAguinaldoTexto").innerHTML = `<i class="fa-solid fa-gift"></i> Aguinaldo Proporcional`;
            document.getElementById("bloqueLiquidacion").style.display = "none";
            
            document.getElementById("legalText").innerText = "Por Renuncia Voluntaria, corresponde la parte proporcional de prestaciones devengadas: Vacaciones (Art. 76), Prima Vacacional mínima (Art. 80) y Aguinaldo Proporcional (Art. 87).";
        }

        // Renderizado de desgloses matemáticos comunes
        document.getElementById("valVacaciones").innerText = formatMoneda(montoVacacionesProp);
        document.getElementById("procVacaciones").innerHTML = `<strong>Fórmula:</strong> (${diasQueCorresponden} ÷ 365) = ${factorVacaciones.toFixed(4)} × ${totalDiasTranscurridos} días = ${diasVacProporcionalesNoRedondeado.toFixed(3)} días -> Redondeado a ${diasVacProporcionales} días × $${salarioDiario.toFixed(2)}<div>= $${montoVacacionesProp.toFixed(2)}</div>`;

        if (diasVencidosInput > 0) {
            document.getElementById("valVacacionesPendientes").innerText = formatMoneda(montoVacacionesVencidas);
            document.getElementById("procVacacionesPendientes").innerHTML = `${diasVencidosInput} días × $${salarioDiario.toFixed(2)}<div>= $${montoVacacionesVencidas.toFixed(2)}</div>`;
            document.getElementById("blockVacacionesPendientes").style.display = "block";
        } else {
            document.getElementById("blockVacacionesPendientes").style.display = "none";
        }

        document.getElementById("valPrimaVacacional").innerText = formatMoneda(montoPrimaVacacional);
        document.getElementById("procPrimaVacacional").innerHTML = `<strong>Fórmula del Pintarrón (D.C. × SD × .25):</strong> ${diasQueCorresponden} días correspondientes × $${salarioDiario.toFixed(2)} (SD) × 0.25<div>= $${montoPrimaVacacional.toFixed(2)}</div>`;

        document.getElementById("valAguinaldo").innerText = formatMoneda(montoAguinaldo);
        document.getElementById("procAguinaldo").innerHTML = `<strong>Fórmula (${aguinaldoBaseInput} días):</strong> (${aguinaldoBaseInput} ÷ 365) = ${factorAguinaldoFijo.toFixed(4)} × ${totalDiasTranscurridos} días = ${diasAguinaldoProp.toFixed(2)} días × $${salarioDiario.toFixed(2)}<div>= $${montoAguinaldo.toFixed(2)}</div>`;

        document.getElementById("outNombre").innerText = nombre;
        document.getElementById("outAntiguedadText").innerText = `${anios} años, ${meses} meses, ${dias} días`;
        document.getElementById("outDiasTotales").innerText = totalDiasTranscurridos;
        document.getElementById("outSD").innerText = formatMoneda(salarioDiario);
        document.getElementById("valTotalFiniquito").innerText = `${formatMoneda(granTotalFinal)} MXN`;

        emptyState.style.display = "none";
        resultsContent.style.display = "block";

        // CONFIGURACIÓN DE LA GRÁFICA DE DONA
        const ctx = document.getElementById('montoChart').getContext('2d');
        if (chartInstance) { chartInstance.destroy(); }

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labelsGrafica,
                datasets: [{
                    data: datosGrafica,
                    backgroundColor: coloresGrafica,
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, font: { size: 11, family: 'Inter' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let value = context.raw || 0;
                                return ' ' + context.label + ': $' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
                            }
                        }
                    }
                }
            }
        });
    }

    function formatMoneda(cant) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cant);
    }

    function limpiarFormulario() {
        form.reset();
        labelFechaSalida.innerHTML = `<i class="fa-solid fa-calendar-minus"></i> Fecha de Salida`;
        emptyState.style.display = "block";
        resultsContent.style.display = "none";
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    }
});
